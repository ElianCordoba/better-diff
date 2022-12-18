import { equals, getNodeForPrinting } from "./utils";
import { colorFn, getSourceWithChange, k } from "./reporter";
import { Node } from "./node";
import { getOptions } from "./index";

interface IteratorOptions {
  name?: string;
  source?: string;
}

export class Iterator {
  name?: string;
  // TODO: Maybe optimize? May consume a lot of memory
  chars?: string[];

  private indexOfLastItem = 0;
  matchNumber = 0;

  constructor(private nodes: Node[], options?: IteratorOptions) {
    this.name = options?.name;
    this.chars = options?.source?.split("");
  }

  next(startFrom = 0) {
    for (let i = startFrom; i < this.nodes.length; i++) {
      const item = this.nodes[i];

      if (item.matched) {
        continue;
      }

      this.indexOfLastItem = i;
      return item;
    }
  }

  peek(index: number) {
    const item = this.nodes[index];

    if (!item || item.matched) {
      return;
    }

    return item;
  }

  mark(index: number) {
    // TODO: Should only apply for moves, otherwise a move, addition and move
    // will display 1 for the first move and 3 for the second
    this.matchNumber++;
    this.nodes[index].matched = true;
    this.nodes[index].matchNumber = this.matchNumber;
  }

  getCandidates(
    expected: Node,
  ): number[] {
    // This variable will hold the indexes of known nodes that match the node we are looking for.
    // We returns more than once in order to calculate the LCS from a multiple places and then take the best result
    const candidates: number[] = [];

    // Start from the next node
    let offset = 0;

    const search = (startFrom: number): void => {
      const ahead = this.nodes[startFrom + offset];
      const back = this.nodes[startFrom - offset];

      // We checked everything and nothing was found, exit early
      if (!ahead && !back) {
        return;
      }

      const foundAhead = ahead && !ahead.matched && equals(expected, ahead);
      const foundBack = back && !back.matched && equals(expected, back);

      if (foundAhead || foundBack) {
        const index = foundAhead ? startFrom + offset : startFrom - offset;

        candidates.push(index);
      }

      offset++;

      if (offset >= getOptions().maxMatchingOffset) {
        return;
      }

      return search(startFrom);
    };

    search(this.indexOfLastItem);

    return candidates;
  }

  getNodesFromExpression(expression: number, startIndex: number) {
    const remainingNodes: Node[] = [];
    let i = startIndex;
    while (true) {
      const next = this.nodes[i];

      if (!next || next.expressionNumber === expression) {
        break;
      }

      if (next.matched) {
        i++;
        continue;
      }

      remainingNodes.push(next);
      i++;
    }

    return remainingNodes;
  }

  printList() {
    console.log(`${colorFn.blue("index")} | ${colorFn.magenta("match n°")} | ${colorFn.green("exp n°")} | ${colorFn.red("         kind          ")} | ${colorFn.yellow("text")}`);

    const list = this.nodes.map((x) => {
      let colorFn = x.matched ? k.green : k.grey;

      const index = String(x.index).padStart(3).padEnd(6);

      const matchNumber = String(x.matchNumber).padStart(5).padEnd(10);
      const expressionNumber = String(x.expressionNumber || "-").padStart(5).padEnd(8);

      const { kind, text } = getNodeForPrinting(x);
      const _kind = kind.padStart(5).padEnd(25);
      const _text = ` ${text}`;

      const row = `${index}|${matchNumber}|${expressionNumber}|${colorFn(_kind)}|${_text}`;

      if (x.index === this.indexOfLastItem) {
        colorFn = k.cyan;
      }

      return colorFn(row);
    });

    console.log(list.join("\n"));
  }

  printRange(node: Node | undefined) {
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
        nodeToDraw = next;
      }
    }

    if (!nodeToDraw) {
      console.warn("Tried to draw a range but there was no node");
      return;
    }

    const { start, end } = nodeToDraw.getPosition();
    const result = getSourceWithChange(this.chars, start, end, colorFn.magenta);

    console.log(result.join(""));
  }
}
