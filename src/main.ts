import { getNodesArray, Node } from "./ts-util";
import { Change, ChangeType, Item, Range } from "./types";
import { equals, NodeIterator, Iterator, listEnded } from "./utils";


export function getInitialDiffs(codeA: string, codeB: string): Change[] {
  const changes: Change[] = []

  const nodesA = getNodesArray(codeA)
  const nodesB = getNodesArray(codeB)

  const iterA = NodeIterator(nodesA);
  const iterB = NodeIterator(nodesB);

  let a: Item | undefined;
  let b: Item | undefined;

  do {
    a = iterA.next();
    b = iterB.next();

    if (!a || !b) {
      break
    }

    if (equals(a.node, b.node)) {
      iterA.markMatched()
      iterB.markMatched()
      continue;
    }

    if (listEnded(a.node)) {
      // Mark eof
      iterA.markMatched()

      const remainingChanges = oneSidedIteration(iterB, ChangeType.addition)
      changes.push(...remainingChanges)
      break;
    }

    if (listEnded(b.node)) {
      // Mark eof
      iterB.markMatched()

      const remainingChanges = oneSidedIteration(iterA, ChangeType.removal)
      changes.push(...remainingChanges)
      break;
    }

    const nearbyMatch = iterB.nextNearby(a.node);

    if (nearbyMatch) {
      iterA.markMatched()
      iterB.markMatched()

      changes.push(getChange(ChangeType.move, a.node, b.node))
      continue;
    }

    // No match
    changes.push(getChange(ChangeType.change, a.node, b.node))

    // En verdad mas que matched seria unmatched pero lo quiero marcar con algo
    iterA.markMatched()
    iterB.markMatched()
  } while (a) // If there are no more nodes, a will be undefined

  // TODO: Enable this after I handle change type in there
  // return compactChanges(changes)
  return changes
}

function oneSidedIteration(iter: Iterator, typeOfChange: ChangeType.addition | ChangeType.removal): Change[] {
  const changes: Change[] = [];

  let value = iter.next()

  while (value) {
    if (typeOfChange === ChangeType.addition) {
      changes.push(getChange(typeOfChange, undefined, value.node))
    } else {
      changes.push(getChange(typeOfChange, value.node, undefined))
    }

    iter.markMatched()

    value = iter.next()
  }

  return changes
}

function getChange(type: ChangeType, a: Node | undefined, b: Node | undefined): Change {
  return {
    type,
    rangeA: a ? getRange(a) : undefined,
    rangeB: b ? getRange(b) : undefined,
  }
}

function getRange(node: Node): Range {
  return {
    // Each node owns the trivia before until the previous token, so this is the real start
    start: node.getLeadingTriviaWidth(),
    end: node.end
  }
}

export function tryMergeRanges(rangeA: Range, rangeB: Range): Range | undefined {
  if (rangeA.start === rangeB.start && rangeA.end === rangeB.end) {
    return rangeA
  }

  let newStart: number;
  let newEnd: number;

  if (rangeA.end >= rangeB.start && rangeB.end >= rangeA.start) {
    newStart = Math.min(rangeA.start, rangeB.start)
    newEnd = Math.max(rangeA.end, rangeB.end)

    return {
      start: newStart,
      end: newEnd
    }
  }
}

// TODO: Compact at the moment when we push new changes to the array. Mainly to save memory since we will avoid having a big array before the moment of compaction 
export function compactChanges(changes: Change[]) {
  let i = 0;

  let next = changes.at(i + 1)
  while (next) {
    const current = changes.at(i)

    if (current?.type !== next.type) {
      i++
      next = changes.at(i + 1)
      continue
    }

    // TODO: How to compact move
    const readFrom = current?.type === ChangeType.removal ? 'rangeA' : 'rangeB'

    const currentRange = current![readFrom]!
    const nextRange = next[readFrom]!

    const compatible = tryMergeRanges(currentRange, nextRange)

    if (compatible) {
      changes.splice(i, 2, { ...current, [readFrom]: compatible } as Change)
      next = changes.at(i + 1)
      continue
    }

    i++
    next = changes.at(i + 1)
  }

  return changes
}