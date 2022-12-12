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

    // This are the expressions we are matching. We store the them so that at the end of the LCS matching we can finish 
    // matching these before moving on another expression
    const expressionA = iterA.peek(indexA)?.expressionNumber!
    const expressionB = iterB.peek(indexB)?.expressionNumber!

    const change = matchSubsequence({ bestIndex, bestResult }, iterA, iterB, indexA, indexB)

    if (change) {
      changes.push(change)
    }

    // We look for remaining nodes at index + bestResult because we don't want to include the already matched ones
    const remainingNodesA = iterA.getNodesFromExpression(expressionA, indexA + bestResult)
    const remainingNodesB = iterB.getNodesFromExpression(expressionB, indexB + bestResult)

    // If we finished matching the LCS and we don't have any remaining nodes in neither expression, then we are we are done with the matching and we can move on
    if (!remainingNodesA.length && !remainingNodesB.length) {
      continue
    }

    // If we still have nodes remaining, means that after the LCS the expression still had more nodes that we need to match before moving on

    // Fast path: The following are two fast paths, they if we have an side with no nodes remaining while the other still has. 
    // If this is the case, then it's a simple push of additions or removals

    // No more nodes on the A side but still remaining on the B side. Report new additions
    if (!remainingNodesA.length && remainingNodesB.length) {
      for (const node of remainingNodesB) {
        iterB.mark(node.index)
        changes.push(getChange(ChangeType.addition, undefined, node));
      }
      continue
    }

    // No more nodes on the B side but still remaining on the A side. Report new removals
    if (!remainingNodesB.length && !remainingNodesA.length) {
      for (const node of remainingNodesA) {
        iterA.mark(node.index)
        changes.push(getChange(ChangeType.removal, node, undefined));
      }
      continue
    }

    // If there are still nodes on both side, we need try match them, otherwise we report the addition/removal
    changes.push(...finishSequenceMatching(iterA, iterB, remainingNodesA, remainingNodesB))
    changes.push(...finishSequenceMatching(iterB, iterA, remainingNodesB, remainingNodesA))
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
function matchSubsequence(lcsResult: LCSResult, iterA: Iterator, iterB: Iterator, indexA: number, indexB: number): Change | undefined {
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

  // If the nodes are not in the same position then it's a move
  // TODO: Reported in the readme, this is too sensible
  const didChange = iterA.indexOfLastItem !== iterB.indexOfLastItem;

  if (didChange) {
    return getChange(
      ChangeType.move,
      a!.node,
      b!.node,
      rangeA,
      rangeB,
    )
  }
}

function finishSequenceMatching(iterA: Iterator, iterB: Iterator, remainingNodesA: Node[], remainingNodesB: Node[]): Change[] {
  const changes: Change[] = []

  let i = 0;
  while (i < remainingNodesA.length) {
    const current: Node = iterA.next(i)!.node

    const candidatesInRemainingNodes = searchCandidatesInList(remainingNodesB, current)
    const candidates = candidatesInRemainingNodes.length ? candidatesInRemainingNodes : iterB.getCandidates(current);

    // Something added or removed
    if (!candidates.length) {
      iterA.mark()
      changes.push(getChange(ChangeType.removal, current, undefined))
      i++

      continue;
    }

    const lcs = getLCS(candidates, iterA, iterB);
    let _indexA = current?.index!;
    let _indexB = lcs.bestIndex;

    const change = matchSubsequence(lcs, iterA, iterB, _indexA, _indexB)

    if (change) {
      changes.push(change)
    }


    i += lcs.bestResult
  }

  // TODO
  // if (i != remainingNodesA.length) {
  //   throw new Error(`After finishing the whole sequence matching the length didn't match, expected ${remainingNodesA.length} but got ${i}`)
  // }

  return changes
}

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