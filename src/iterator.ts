import { Item } from "./types";
import { equals } from "./utils";
import { Node } from './ts-util'

export interface Iterator {
  next: () => Item | undefined;
  markMatched: (index?: number) => void;
  nextNearby: (expected: Node, startAtIndex?: number) => Item | undefined;
  getItems: () => Item[];
  getName: () => string;
}

export function NodeIterator(nodes: Node[], name: string = ''): Iterator {
  const iteratorName = name;
  const items: Item[] = nodes.map((node, index) => ({
    node,
    index,
    matched: false,
  }));

  let lastIndexSeen: number;
  function next(): Item | undefined {
    let i = -1;
    for (const item of items) {
      i++;
      if (item.matched) {
        continue;
      }

      lastIndexSeen = i;
      return item;
    }

    return;
  }

  const MAX_OFFSET = 50;
  let offset = 1;

  function nextNearby(
    expected: Node,
    startAtIndex = lastIndexSeen,
  ): Item | undefined {
    const ahead = items[startAtIndex + offset];
    const back = items[startAtIndex - offset];

    // We checked everything and nothing was found, exit early
    if (!ahead && !back) {
      offset = 0;
      return undefined;
    }

    if (ahead && !ahead.matched && equals(expected, ahead.node)) {
      const index = startAtIndex + offset;

      // Set this so the markMatched works
      lastIndexSeen = index;

      offset = 0;
      return items[index];
    } else if (back && !back.matched && equals(expected, back.node)) {
      const index = startAtIndex - offset;

      // Set this so the markMatched works
      lastIndexSeen = index;

      offset = 0;
      return items[index];
    }

    offset++;

    if (offset >= MAX_OFFSET) {
      offset = 0;
      return undefined;
    }

    return nextNearby(expected, startAtIndex);
  }

  function markMatched(index = lastIndexSeen) {
    items[index].matched = true;
  }

  function getItems() {
    return items;
  }

  function getName() {
    return iteratorName
  }

  return { next, markMatched, nextNearby, getItems, getName };
}