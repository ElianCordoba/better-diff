import { getNodesArray, Node } from "./ts-util";
import { Change, ChangeType, Item, Range } from "./types";
import { equals, NodeIterator, Iterator, listEnded } from "./utils";


export function getInitialDiffs(codeA: string, codeB: string): Change[] {
  const nodesA = getNodesArray(codeA)
  const nodesB = getNodesArray(codeB)

  const changes: Change[] = []

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

    if (equals(a.node, b.node)) {
      iterA.markMatched()
      iterB.markMatched()
      continue;
    }

    const nearbyMatch = iterB.nextNearby(a.node);

    if (nearbyMatch) {
      iterA.markMatched()
      iterB.markMatched()

      changes.push(getChange(ChangeType.change, a.node, b.node))
      continue;
    }

    // No match
    changes.push(getChange(ChangeType.removal, a.node, b.node))

    // En verdad mas que matched seria unmatched pero lo quiero marcar con algo
    iterA.markMatched()
  } while (a) // If there are no more nodes, a will be undefined

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
    start: node.pos,
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

// TODO: compactar cuando hacemos un push a changes
export function compactChanges(changes: Change[]) {
  let additionChanges: Change[] = changes.filter(x => x.type === ChangeType.addition)

  let i = 0;

  let next = additionChanges.at(i + 1)

  while (next) {
    const current = additionChanges.at(i)

    // rangeB porque estamos en additions
    const compatible = tryMergeRanges(current?.rangeB!, next?.rangeB!)

    if (compatible) {
      additionChanges.splice(i, 2, { ...current, rangeB: compatible } as Change)
      next = additionChanges.at(i + 1)
      // no i++
      continue
    }

    i++
    next = additionChanges.at(i + 1)
  }

  return additionChanges
}