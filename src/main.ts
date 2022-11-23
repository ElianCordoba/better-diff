import { SyntaxKind } from "typescript";
import { getNodesArray, Node } from "./ts-util";
import { Change, ChangeType, Item, Range } from "./types";
import { equals, Iterator, listEnded, NodeIterator } from "./utils";

export function getInitialDiffs(codeA: string, codeB: string): Change[] {
  const changes: Change[] = [];

  const nodesA = getNodesArray(codeA);
  const nodesB = getNodesArray(codeB);

  const iterA = NodeIterator(nodesA);
  const iterB = NodeIterator(nodesB);

  let a: Item | undefined;
  let b: Item | undefined;

  do {
    a = iterA.next();
    b = iterB.next();

    if (!a || !b) {
      const iterOn = !a ? iterB : iterA;
      const type = !a ? ChangeType.addition : ChangeType.removal;

      const remainingChanges = oneSidedIteration(iterOn, type);
      changes.push(...remainingChanges);
      break;
    }

    if (equals(a.node, b.node)) {
      iterA.markMatched();
      iterB.markMatched();
      continue;
    }

    const nearbyMatch = iterB.nextNearby(a.node);

    if (nearbyMatch) {
      iterA.markMatched();
      iterB.markMatched();

      changes.push(getChange(ChangeType.move, a.node, b.node));
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

  return compactChanges(changes as any);
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
): Change {
  return {
    rangeA: a ? getRange(a) : undefined,
    rangeB: b ? getRange(b) : undefined,
    type,
    nodeA: a,
    nodeB: b,
  };
}

function getRange(node: Node): Range {
  return {
    // Each node owns the trivia before until the previous token, for example:
    //
    // age = 24
    //      ^
    //      Trivia for the number literal starts here, but you don't want to start the diff here
    //
    // This is why we add the leading trivia to the `start` of the node, so we get where the actual
    // value of the node starts and not where the trivia starts
    start: node.pos + node.getLeadingTriviaWidth(),
    end: node.end,
  };
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
export function compactChanges(changes: (Change & { seen: boolean })[]) {
  const newChanges: Change[] = [];

  let currentChangeIndex = -1;
  for (const change of changes) {
    let candidate = change;

    currentChangeIndex++;

    if (change.seen) {
      continue;
    }

    // TODO
    if (change.type === ChangeType.move || change.type === ChangeType.change) {
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

      candidate = { ...candidate, [readFrom]: compatible };

      nextIndex++;
      continue;
    }

    newChanges.push(candidate);
  }

  return newChanges;
}
