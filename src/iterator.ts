import { Item } from "./types";
import { equals, formatSyntaxKind, getRange } from "./utils";
import { Node } from "./ts-util";
import { colorFn, getSourceWithChange, k } from "./reporter";

export interface Iterator {
  next: () => Item | undefined;
  markMatched: (index?: number) => void;
  getCandidatesNodes: (expected: Node, startAtIndex?: number) => number[];
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
  matchNumber = 0;

  readonly MAX_OFFSET = 500;

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

  getCandidatesNodes(
    expected: Node,
  ): number[] {

    // This variable will hold the indexes of known nodes that match the node we are looking for.
    // We returns more than once in order to calculate the LCS from a multiple places and then take the best result
    const candidates: number[] = []

    // Start from the next node
    let offset = 0

    const search = (startFrom: number): void => {
      const ahead = this.items[startFrom + offset];
      const back = this.items[startFrom - offset];

      // We checked everything and nothing was found, exit early
      if (!ahead && !back) {
        return;
      }

      const foundAhead = ahead && !ahead.matched && equals(expected, ahead.node)
      const foundBack = back && !back.matched && equals(expected, back.node)

      if (foundAhead || foundBack) {
        const index = foundAhead ? startFrom + offset : startFrom - offset;

        candidates.push(index);
      }

      offset++;

      if (offset >= this.MAX_OFFSET) {
        return;
      }

      return search(startFrom);
    }

    search(this.indexOfLastItem)

    return candidates
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
