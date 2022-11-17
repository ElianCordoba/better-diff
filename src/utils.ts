import { ts, Node } from "./ts-util";
import { Item } from './types'

export function formatSyntaxKind(kind: any) {
  return ts.Debug.formatSyntaxKind(kind)
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA.kind === nodeB.kind && nodeA.text === nodeB.text
}

export function listEnded(node: Node): boolean {
  return node.kind === ts.SyntaxKind.EndOfFileToken
}

export interface Iterator {
  next: () => Item | undefined;
  markMatched: (index?: number) => void;
  nextNearby: (expected: Node, startAtIndex?: number) => Item | undefined;
}

export function NodeIterator(nodes: Node[]): Iterator {
  const items: Item[] = nodes.map((node, index) => ({ node, index, matched: false }))

  let lastIndexSeen: number;
  function next(): Item | undefined {
    let i = -1
    for (const item of items) {
      i++
      if (item.matched) {
        continue
      }

      lastIndexSeen = i
      return item
    }

    return
  }

  const MAX_OFFSET = 50;
  let offset = 1;

  function nextNearby(expected: Node, startAtIndex = lastIndexSeen): Item | undefined {
    const ahead = items[startAtIndex + offset]
    const back = items[startAtIndex - offset]

    if (ahead && !ahead.matched && equals(expected, ahead.node)) {
      const index = startAtIndex + offset

      // Set this so the markMatched works
      lastIndexSeen = index

      offset = 0
      return items[index]
    } else if (back && !back.matched && equals(expected, back.node)) {
      const index = startAtIndex - offset

      // Set this so the markMatched works
      lastIndexSeen = index


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