import { Item } from "./types";
import { equals } from "./utils";
import { Node } from './ts-util'

export interface Iterator {
  next: () => Item | undefined;
  markMatched: (index?: number) => void;
  nextNearby: (expected: Node, startAtIndex?: number) => Item | undefined;
}

export class NodeIterator implements Iterator {
  name: string;

  items: Item[];
  lastIndexSeen = 0
  offset = 1;

  readonly MAX_OFFSET = 50;

  constructor(nodes: Node[], name: string = '') {
    this.name = name;

    this.items = nodes.map((node, index) => ({
      node,
      index,
      matched: false,
    }));
  }

  next() {
    let i = -1;
    for (const item of this.items) {
      i++;
      if (item.matched) {
        continue;
      }

      this.lastIndexSeen = i;
      return item;
    }

    return;
  }

  markMatched(index = this.lastIndexSeen) {
    this.items[index].matched = true;
  }

  nextNearby(
    expected: Node,
    startAtIndex = this.lastIndexSeen,
  ): Item | undefined {
    const ahead = this.items[startAtIndex + this.offset];
    const back = this.items[startAtIndex - this.offset];

    // We checked everything and nothing was found, exit early
    if (!ahead && !back) {
      this.offset = 0;
      return undefined;
    }

    if (ahead && !ahead.matched && equals(expected, ahead.node)) {
      const index = startAtIndex + this.offset;

      // Set this so the markMatched works
      this.lastIndexSeen = index;

      this.offset = 0;
      return this.items[index];
    } else if (back && !back.matched && equals(expected, back.node)) {
      const index = startAtIndex - this.offset;

      // Set this so the markMatched works
      this.lastIndexSeen = index;

      this.offset = 0;
      return this.items[index];
    }

    this.offset++;

    if (this.offset >= this.MAX_OFFSET) {
      this.offset = 0;
      return undefined;
    }

    return this.nextNearby(expected, startAtIndex);
  }
}