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

    // For debugging
    // console.log('A\n')
    // iterA.printList()
    // console.log('\n')

    // console.log('B\n')
    // iterB.printList()
    // console.log('\n')

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
    const candidatesAtoB = iterB.getCandidatesNodes(a.node);
    const candidatesBtoA = iterA.getCandidatesNodes(b.node);

    // We didn't find any match
    if (candidatesAtoB.length === 0 && candidatesBtoA.length === 0) {
      // TODO: Maybe push change type 'change' ?
      changes.push(getChange(ChangeType.addition, a.node, b.node));
      changes.push(getChange(ChangeType.removal, a.node, b.node));

      iterA.markMatched();
      iterB.markMatched();
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

    let rangeA: Range | undefined;
    let rangeB: Range | undefined;

    for (let index = bestIndex; index < bestIndex + bestResult; index++) {
      a = iterA.next(indexA);
      b = iterB.next(indexB);

      indexA++;
      indexB++;

      iterA.markMatched();
      iterB.markMatched();

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

    const noChange = iterA.indexOfLastItem === iterB.indexOfLastItem;

    // Again, if the nodes are in the same index means that we don't need to report anything
    if (noChange) {
      continue;
    }

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
    continue;
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

    iter.markMatched();

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

    // TODO
    if (change.type === ChangeType.change) {
      console.log("Ignoring", change.type);
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

function getLCS(candidates: number[], iterA: Iterator, iterB: Iterator) {
  let bestResult = 0;
  let bestIndex = 0;

  for (const index of candidates) {
    const lcs = getSequenceLength(iterA, iterB, iterA.indexOfLastItem, index);

    if (lcs > bestResult) {
      bestResult = lcs;
      bestIndex = index;
    }
  }

  return { bestIndex, bestResult };
}
