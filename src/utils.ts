import { Item } from "./main2";
import { ts, Node } from "./ts-util";

export function formatSyntaxKind(kind: any) {
  return ts.Debug.formatSyntaxKind(kind)
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA.kind === nodeB.kind && nodeA.text === nodeB.text
}

export class NodeIterator {
  private items: Item[];
  private cursor = 0;

  constructor(private nodeList: Node[]) {
    this.items = nodeList.map(x => ({ node: x, matched: false }))
  }

  // does not include unmatched nodes above the cursor
  next(): Node {
    const { item, foundAt } = findNextNonMatched(this.items, this.cursor);
    return item.node
  }

  private MAX_OFFSET = 5;
  private offset = 0;
  nextNearby(expected: Item) {
    const ahead = this.items[this.cursor + this.offset]
    const back = this.items[this.cursor - this.offset]

    if (!ahead.matched && equals(expected.node, ahead.node)) {
      this.offset = 0
      return this.cursor + this.offset
    } else if (!back.matched && equals(expected.node, back.node)) {
      this.offset = 0
      return this.cursor - this.offset
    }

    this.offset++

    if (this.offset >= this.MAX_OFFSET) {
      this.offset = 0
      return
    }

    this.nextNearby(expected)
  }

  markMatched(index = this.cursor) {
    this.items[index].matched = true
    // TODO
    this.cursor++
  }
}

function findNextNonMatched(items: Item[], innerCursor: number): { item: Item, foundAt: number } {
  const candidate = items[innerCursor];
  if (candidate.matched) {
    innerCursor++
    return findNextNonMatched(items, innerCursor)
  }

  return { item: candidate, foundAt: innerCursor }
}

export function NodeIterator2(nodes: Node[]) {
  const items: Item[] = nodes.map((node, index) => ({ node, index, matched: false }))

  let lastIndexSeen: number;
  function next(): Item {
    let i = -1
    for (const item of items) {
      i++
      if (item.matched) {
        continue
      }

      lastIndexSeen = i
      return item
    }

    //lastIndexSeen
    return { node: undefined, lastNode: true } as any
  }

  const MAX_OFFSET = 50;
  let offset = 0;

  function nextNearby(expected: Node, startAtIndex = lastIndexSeen): Item | undefined {
    const ahead = items[startAtIndex + offset]
    const back = items[startAtIndex - offset]

    if (!ahead?.matched && equals(expected, ahead.node)) {
      const index = startAtIndex + offset
      offset = 0
      return items[index]
    } else if (!back?.matched && equals(expected, back.node)) {
      const index = startAtIndex - offset
      offset = 0
      return items[index]
    }

    offset++

    if (offset >= MAX_OFFSET) {
      offset = 0
      return undefined
    }

    return nextNearby(expected, startAtIndex)
  }

  function markMatched(index = lastIndexSeen) {
    items[index].matched = true
  }

  return { next, markMatched, nextNearby }

}