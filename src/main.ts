import { getNodesArray, Node } from "./ts-util";
import { ChangeType, Item, Range } from "./types";
import { equals, getRange, mergeRanges } from "./utils";
import { Iterator, NodeIterator } from "./iterator";
import { Change } from "./change";

export function getInitialDiffs(codeA: string, codeB: string): Change[] {
  const changes: Change[] = [];

  const nodesA = getNodesArray(codeA);
  const nodesB = getNodesArray(codeB);

  const iterA = new NodeIterator(nodesA, { name: "a", source: codeA });
  const iterB = new NodeIterator(nodesB, { name: "b", source: codeB });

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

    if (!a || !b) {
      const iterOn = !a ? iterB : iterA;
      const type = !a ? ChangeType.addition : ChangeType.removal;

      const remainingChanges = oneSidedIteration(iterOn, type);
      changes.push(...remainingChanges);
      break;
    }

    if (equals(a.node, b.node)) {
      if (a.index !== b.index) {
        changes.push(getChange(ChangeType.move, a.node, b.node));
      }
      iterA.markMatched();
      iterB.markMatched();
      continue;
    }

    const nearbyMatch = iterB.nextNearby(a.node);

    if (nearbyMatch) {
      // Try match the following nodes on each to the longest common subsequence (LCS)
      const lcs = getLCS(iterA, iterB, a.index, nearbyMatch.index)

      let rangeA: Range = { start: 0, end: 0 }
      let rangeB: Range = { start: 0, end: 0 }

      for (let index = 0; index < lcs; index++) {
        a = iterA.next()
        b = iterB.next(nearbyMatch.index)

        iterA.markMatched();
        iterB.markMatched();

        rangeA = mergeRanges(rangeA, getRange(a!.node))
        rangeB = mergeRanges(rangeB, getRange(b!.node))
      }

      changes.push(getChange(ChangeType.move, a!.node, nearbyMatch.node, rangeA, rangeB));
      continue;
    }

    // No match
    // TODO: Maybe push change type 'change' ?
    changes.push(getChange(ChangeType.addition, a.node, b.node));
    changes.push(getChange(ChangeType.removal, a.node, b.node));

    // En verdad mas que matched seria unmatched pero lo quiero marcar con algo
    iterA.markMatched();
    iterB.markMatched();
  } while (a); // If there are no more nodes, a will be undefined

  return compactChanges(changes);
}

function oneSidedIteration(
  iter: Iterator,
  typeOfChange: ChangeType.addition | ChangeType.removal,
): Change[] {
  const changes: Change[] = [];

  let value = iter.next();

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
  rangeB?: Range
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

export function getLCS(iterA: Iterator, iterB: Iterator, indexA: number, indexB: number): number {
  // Represents how long is the sequence
  let sequence = 0

  while (true) {
    const nextA = iterA.peek(indexA)

    if (!nextA) {
      break
    }

    const nextB = iterB.peek(indexB)

    if (!nextB) {
      break
    }

    if (!equals(nextA, nextB)) {
      break;
    }

    indexA++
    indexB++
    sequence++
  }

  return sequence
}
