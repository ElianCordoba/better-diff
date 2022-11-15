import { Item } from "./main";
import { ts, Node } from "./ts-util";

export function formatSyntaxKind(kind: any) {
  return ts.Debug.formatSyntaxKind(kind)
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA.kind === nodeB.kind && nodeA.text === nodeB.text
}

export function NodeIterator(nodes: Node[]) {
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