import { Item } from "./types";
import { equals, formatSyntaxKind, getRange } from "./utils";
import { Node } from "./ts-util";
import { colorFn, getSourceWithChange, k } from "./reporter";

export interface Iterator {
  next: () => Item | undefined;
  markMatched: (index?: number) => void;
  nextNearby: (expected: Node, startAtIndex?: number) => Item | undefined;
  peek: (index: number) => Node | undefined
}

interface IteratorOptions {
  name?: string;
  source?: string;
}

export class NodeIterator implements Iterator {
  name?: string;
  // TODO: Maybe optimize? May consume a lot of memory
  chars?: string[];

  items!: Item[];
  indexOfLastItem = 0;
  offset = 1;
  matchNumber = 0;

  readonly MAX_OFFSET = 50;

  constructor(nodes: Node[], options?: IteratorOptions) {
    this.name = options?.name;
    this.chars = options?.source?.split("");

    this.items = nodes.map((node, index) => ({
      node,
      index,
      matched: false,
      matchNumber: 0,
      kind: formatSyntaxKind(node),
    } as Item));
  }

  next(startFrom = 0) {
    for (let i = startFrom; i < this.items.length; i++) {
      const item = this.items[i];

      if (item.matched) {
        continue;
      }

      this.indexOfLastItem = i;
      return item;
    }
  }

  peek(index: number) {
    const item = this.items[index];

    if (!item || item.matched) {
      return
    }

    return item.node
  }

  markMatched(index = this.indexOfLastItem) {
    // TODO: Should only apply for moves, otherwise a move, addition and move
    // will display 1 for the first move and 3 for the second
    this.matchNumber++;
    this.items[index].matched = true;
    this.items[index].matchNumber = this.matchNumber;
  }

  nextNearby(
    expected: Node,
    startAtIndex = this.indexOfLastItem,
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
      this.indexOfLastItem = index;

      this.offset = 0;
      return this.items[index];
    } else if (back && !back.matched && equals(expected, back.node)) {
      const index = startAtIndex - this.offset;

      // Set this so the markMatched works
      this.indexOfLastItem = index;

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

  printList() {
    const list = this.items.map((x) => {
      const kind = formatSyntaxKind(x.node);
      const colorFn = x.matched ? k.blue : k.grey;

      return `${String(x.matchNumber).padEnd(3)}| ${colorFn(kind)}`;
    });

    console.log(list.join("\n"));
  }

  drawRange(node: Node | undefined) {
    if (!this.chars) {
      console.warn("Tried to draw a range but there was no source");
      return;
    }

    let nodeToDraw: Node | undefined;

    if (node) {
      nodeToDraw = node;
    } else {
      const next = this.next();

      if (next) {
        nodeToDraw = next.node;
      }
    }

    if (!nodeToDraw) {
      console.warn("Tried to draw a range but there was no node");
      return;
    }

    const { start, end } = getRange(nodeToDraw);
    const result = getSourceWithChange(this.chars, start, end, colorFn.magenta);

    console.log(result.join(""));
  }
}
