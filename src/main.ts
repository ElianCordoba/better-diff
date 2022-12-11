import { getNodesArray, Node } from "./ts-util";
import { ChangeType, Item, Range } from "./types";
import { equals, getRange, mergeRanges } from "./utils";
import { Iterator } from "./iterator";
import { Change } from "./change";

export function getInitialDiffs(codeA: string, codeB: string): Change[] {
  const changes: Change[] = [];

  const nodesA = getNodesArray(codeA);
  const nodesB = getNodesArray(codeB);

  const iterA = new Iterator(nodesA, { name: "a", source: codeA });
  const iterB = new Iterator(nodesB, { name: "b", source: codeB });

  let a: Item | undefined;
  let b: Item | undefined;

  do {
    a = iterA.next();
    b = iterB.next();

    // We are done, no more nodes left to check
    if (!a && !b) {
      break;
    }

    // One of the iterators finished. We will traverse the remaining nodes in the other iterator
    if (!a || !b) {
      const iterOn = !a ? iterB : iterA;
      const type = !a ? ChangeType.addition : ChangeType.removal;

      const remainingChanges = oneSidedIteration(iterOn, type);
      changes.push(...remainingChanges);
      break;
    }

    // We will try to match the code, comparing a node to another one on the other iterator
    // For a node X in the iterator A, we could get multiple possible matches on iterator B
    // But, we also check from the perspective of the iterator B, this is because of the following example
    // A: 1 2 x 1 2 3
    // B: 1 2 3
    // From the perspective of A, the LCS is [1, 2], but from the other perspective it's the real maxima [1, 2, 3]
    // More about this in the move tests
    const candidatesAtoB = iterB.getCandidates(a.node);
    const candidatesBtoA = iterA.getCandidates(b.node);

    // We didn't find any match
    if (candidatesAtoB.length === 0 && candidatesBtoA.length === 0) {
      // TODO: Maybe push change type 'change' ?
      changes.push(getChange(ChangeType.addition, a.node, b.node));
      changes.push(getChange(ChangeType.removal, a.node, b.node));

      iterA.mark();
      iterB.mark();
      continue;
    }

    const lcsAtoB = getLCS(candidatesAtoB, iterA, iterB);
    const lcsBtoA = getLCS(candidatesBtoA, iterB, iterA);

    let bestIndex: number;
    let bestResult: number;
    let indexA: number;
    let indexB: number;
    let expressionA: number;
    let expressionB: number;

    // For simplicity the A to B perspective has preference
    if (lcsAtoB.bestResult >= lcsBtoA.bestResult) {
      bestIndex = lcsAtoB.bestIndex;
      bestResult = lcsAtoB.bestResult;

      // If the best LCS is found on the A to B perspective, indexA is the current position since we moved on the b side
      indexA = a.index;
      indexB = bestIndex;
    } else {
      bestIndex = lcsBtoA.bestIndex;
      bestResult = lcsBtoA.bestResult;

      // This is the opposite of the above branch, since the best LCS was on the A side, there is were we need to reposition the cursor
      indexA = bestIndex;
      indexB = b.index;
    }

    expressionA = iterA.peek(indexA)?.expressionNumber!
    expressionB = iterB.peek(indexB)?.expressionNumber!

    const { rangeA, rangeB } = matchSubsequence({ bestIndex, bestResult }, iterA, iterB, indexA, indexB)

    // If the nodes are not in the same position then it's a move
    // TODO: Reported in the readme, this is too sensible
    const didChange = iterA.indexOfLastItem !== iterB.indexOfLastItem;

    if (didChange) {
      changes.push(
        getChange(
          ChangeType.move,
          a!.node,
          iterB.peek(bestIndex),
          rangeA,
          rangeB,
        ),
      );
    }

    // We are done matching the common part, now we need finish both expressions

    let remainingNodesA = iterA.getNodesFromExpression(expressionA, indexA)
    const remainingNodesB = iterB.getNodesFromExpression(expressionB, indexB)

    if (remainingNodesA.length) {
      console.log('Iter A still has nodes')

      let i = 0;
      while (i < remainingNodesA.length) {
        const current: Node = iterA.next(i)!.node

        // same thing as getCandidates :S
        function searchCandidatesInList(nodes: Node[], expected: Node) {
          const candidates: number[] = []

          for (const node of nodes) {
            if (equals(node, expected)) {
              candidates.push(node.index)
            }
          }

          return candidates
        }

        const candidatesInRemainingNodes = searchCandidatesInList(remainingNodesB, current)
        const candidates = candidatesInRemainingNodes.length ? candidatesInRemainingNodes : iterB.getCandidates(current);

        // Something added or removed
        if (!candidates.length) {
          // TODO: IDK if we should pass the index, but it doesn't work otherwise
          iterA.mark()
          changes.push(getChange(ChangeType.removal, current, undefined))
          i++

          continue;
        }

        const lcs = getLCS(candidates, iterA, iterB);
        let _indexA = current?.index!;
        let _indexB = lcs.bestIndex;

        const { rangeA, rangeB } = matchSubsequence(lcs, iterA, iterB, _indexA, _indexB)

        const noChange = iterA.indexOfLastItem === iterB.indexOfLastItem;

        if (!noChange) {
          // Otherwise, it was a change
          changes.push(
            getChange(
              ChangeType.move,
              a!.node,
              iterB.peek(bestIndex),
              rangeA,
              rangeB,
            ),
          );
        }

        i += lcs.bestResult
      }

      if (i != remainingNodesA.length) {
        debugger
        console.log('oops, a')
      }
    }
  } while (a); // If there are no more nodes, a will be undefined

  return compactChanges(changes);
}

function oneSidedIteration(
  iter: Iterator,
  typeOfChange: ChangeType.addition | ChangeType.removal,
): Change[] {
  const changes: Change[] = [];

  let value = iter.next();

  // TODO: Compact
  while (value) {
    if (typeOfChange === ChangeType.addition) {
      changes.push(getChange(typeOfChange, undefined, value.node));
    } else {
      changes.push(getChange(typeOfChange, value.node, undefined));
    }

    iter.mark();

    value = iter.next();
  }

  return changes;
}

function getChange(
  type: ChangeType,
  a: Node | undefined,
  b: Node | undefined,
  rangeA?: Range,
  rangeB?: Range,
): Change {
  if (!rangeA) {
    rangeA = a ? getRange(a) : undefined;
  }

  if (!rangeB) {
    rangeB = b ? getRange(b) : undefined;
  }

  return new Change(type, rangeA, rangeB, a, b);
}

export function tryMergeRanges(
  rangeA: Range,
  rangeB: Range,
): Range | undefined {
  if (rangeA.start === rangeB.start && rangeA.end === rangeB.end) {
    return rangeA;
  }

  let newStart: number;
  let newEnd: number;

  if (rangeA.end >= rangeB.start && rangeB.end >= rangeA.start) {
    newStart = Math.min(rangeA.start, rangeB.start);
    newEnd = Math.max(rangeA.end, rangeB.end);

    return {
      start: newStart,
      end: newEnd,
    };
  }
}

// TODO: Compact at the moment when we push new changes to the array. Mainly to save memory since we will avoid having a big array before the moment of compaction
export function compactChanges(changes: (Change & { seen?: boolean })[]) {
  const newChanges: Change[] = [];

  let currentChangeIndex = -1;
  for (const change of changes) {
    const candidate = change;

    currentChangeIndex++;

    if (change.seen) {
      continue;
    }

    if (change.type === ChangeType.move) {
      newChanges.push(change);
      continue;
    }

    // We start from the current position since we known that above changes wont be compatible
    let nextIndex = currentChangeIndex + 1;

    innerLoop:
    while (nextIndex < changes.length) {
      const next = changes[nextIndex];

      if (next.seen) {
        nextIndex++;
        continue;
      }

      if (change.type !== next.type) {
        nextIndex++;
        continue;
      }

      const readFrom = change!.type === ChangeType.removal
        ? "rangeA"
        : "rangeB";

      const currentRange = change![readFrom]!;
      const nextRange = next[readFrom]!;

      const compatible = tryMergeRanges(currentRange, nextRange);

      if (!compatible) {
        nextIndex++;
        // No compatibility at i means that we can break early, there will be no compatibility at i + n because ranges keep moving on
        break innerLoop;
      }

      changes[nextIndex].seen = true;

      candidate[readFrom] = compatible;

      nextIndex++;
      continue;
    }

    newChanges.push(candidate);
  }

  return newChanges;
}

export function getSequenceLength(
  iterA: Iterator,
  iterB: Iterator,
  indexA: number,
  indexB: number,
): number {
  // Represents how long is the sequence
  let sequence = 0;

  while (true) {
    const nextA = iterA.peek(indexA);

    if (!nextA) {
      break;
    }

    const nextB = iterB.peek(indexB);

    if (!nextB) {
      break;
    }

    if (!equals(nextA, nextB)) {
      break;
    }

    indexA++;
    indexB++;
    sequence++;
  }

  return sequence;
}

interface LCSResult { bestIndex: number; bestResult: number; }

function getLCS(candidates: number[], iterA: Iterator, iterB: Iterator): LCSResult {
  let bestResult = 0;
  let bestIndex = 0;

  if (candidates.length === 0) {
    return { bestIndex, bestResult };
  }

  for (const index of candidates) {
    const lcs = getSequenceLength(iterA, iterB, iterA.indexOfLastItem, index);

    if (lcs > bestResult) {
      bestResult = lcs;
      bestIndex = index;
    }
  }

  return { bestIndex, bestResult };
}

// This function has side effects, it's mutates data in the iterators
function matchSubsequence(lcsResult: LCSResult, iterA: Iterator, iterB: Iterator, indexA: number, indexB: number): { rangeA: Range, rangeB: Range } {
  const { bestIndex, bestResult } = lcsResult
  let a: Item;
  let b: Item;

  // let indexA: number;
  // let indexB: number;

  let rangeA: Range | undefined;
  let rangeB: Range | undefined;

  for (let index = bestIndex; index < bestIndex + bestResult; index++) {
    a = iterA.next(indexA)!;
    b = iterB.next(indexB)!;

    if (!equals(a?.node!, b?.node!)) {
      throw new Error(`Misaligned matcher. A: ${indexA} (${a?.node?.prettyKind}), B: ${indexB} (${b?.node?.prettyKind})`)
    }

    indexA++;
    indexB++;

    iterA.mark();
    iterB.mark();

    // If both iterators are in the same position means that the code is the same. Nothing to report we just mark the nodes along the way
    if (a?.index === b?.index) {
      continue;
    }

    if (!rangeA) {
      rangeA = getRange(a!.node);
    } else {
      rangeA = mergeRanges(rangeA, getRange(a!.node));
    }

    if (!rangeB) {
      rangeB = getRange(b!.node);
    } else {
      rangeB = mergeRanges(rangeB, getRange(b!.node));
    }
  }

  return {
    rangeA: rangeA!, rangeB: rangeB!
  }

}