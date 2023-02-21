import { equals, getClosingNode, getNodeForPrinting } from "./utils";
import { colorFn, getSourceWithChange, k } from "./reporter";
import { Node, Status } from "./node";
import { ChangeType } from "./types";
import { assert } from "./debug";
import { getOptions } from ".";
import { NodeMatchingStack } from "./sequence";

interface InputNodes {
  textNodes: Node[];
  allNodes: Node[];
}
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
  public textNodes: Node[];
  public allNodes: Node[];

  bufferedNodesIndexes: number[] = [];

  constructor({ textNodes, allNodes }: InputNodes, options?: IteratorOptions) {
    this.textNodes = textNodes;
    this.allNodes = allNodes;
    this.name = options?.name;
    this.chars = options?.source?.split("");
  }

  // Get the next unmatched node in the iterator, optionally after a given index
  // This may include buffered nodes, which are nodes that remained from a previous match and node they have
  // priority so that we can match those before moving onto other ones
  next(startFrom?: number) {
    // Preferences to buffered nodes, which they are never requested with the `startFrom` argument
    if (startFrom === undefined && this.bufferedNodesIndexes.length) {
      for (const bufferedNodeIndex of this.bufferedNodesIndexes) {
        const bufferedNode = this.textNodes[bufferedNodeIndex];

        if (bufferedNode.status === Status.unmatched) {
          return bufferedNode;
        }
      }
    }

    // If no buffered where present get the next node the standard way
    for (let i = startFrom ?? 0; i < this.textNodes.length; i++) {
      const item = this.textNodes[i];

      if (item.status === Status.matched) {
        continue;
      }

      this.indexOfLastItem = i;
      return item;
    }
  }

  // Find the first closing node that matches the wanted kind
  findClosingNode(openNode: Node, startFrom = 0): Node | undefined {
    const closingNodeKind = getClosingNode(openNode);
    const stack = new NodeMatchingStack(openNode);

    let i = startFrom;

    while (true) {
      const next = this.peek(i, false);
      i++;

      if (!next) {
        return undefined;
      }

      // Not a node we are interested in, skipping
      if (next.kind !== closingNodeKind && next.kind !== openNode.kind) {
        continue;
      }

      stack.add(next);

      // If the stack is empty means that all previous nodes are matched, this last node is the one that closes the all the nodes, the one we are looking for
      if (stack.isEmpty()) {
        return next;
      }
    }
  }

  peek(index: number, skipMatched = true) {
    const item = this.textNodes[index];

    if (!item || (skipMatched && item.status === Status.matched)) {
      return;
    }

    return item;
  }

  /**
   * Set all the `skipped` nodes to `unmatched` so that the next lap of the loop will include them
   */
  reset() {
    for (const node of this.textNodes) {
      if (node.status === Status.skipped) {
        node.status = Status.unmatched
      }
    }
  }

  mark(index: number, markedAs: ChangeType, status: Status = Status.matched) {
    // TODO: Should only apply for moves, otherwise a move, addition and move
    // will display 1 for the first move and 3 for the second
    this.matchNumber++;
    this.textNodes[index].status = status;
    this.textNodes[index].matchNumber = this.matchNumber;
    this.textNodes[index].markedAs = markedAs;
  }

  markMultiple(startIndex: number, numberOfNodes: number, status: Status) {
    let i = startIndex
    while (i < startIndex + numberOfNodes) {
      //TODO MIN
      this.mark(i, ChangeType.move, status)
      i++
    }
  }

  bufferNodes(indexesOfNodesToBuffer: number[]) {
    assert(this.bufferedNodesIndexes.length === 0, "Buffered nodes was not empty when trying to buffer new nodes");

    this.bufferedNodesIndexes = indexesOfNodesToBuffer;
  }

  hasBufferedNodes() {
    const hasBufferedNodes = this.bufferedNodesIndexes.some((x) => this.textNodes[x].status === Status.unmatched);
    return hasBufferedNodes;
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
      const ahead = this.textNodes[startFrom + offset];
      const back = this.textNodes[startFrom - offset];

      // We checked everything and nothing was found, exit early
      if (!ahead && !back) {
        return;
      }

      const foundAhead = ahead && ahead.status === Status.unmatched && equals(expected, ahead);
      const foundBack = back && back.status === Status.unmatched && equals(expected, back);

      if (foundAhead || foundBack) {
        const index = foundAhead ? startFrom + offset : startFrom - offset;

        candidates.push(index);
      }

      offset++;

      if (offset >= getOptions?.()?.maxMatchingOffset) {
        return;
      }

      return search(startFrom);
    };

    search(this.indexOfLastItem);

    return candidates;
  }

  getNodesFromExpression(node: Node, expressionNumber: number): Node[] {
    assert(node, "Undefined node when getting nodes from a given expression");

    // Using === on two object with only return true if both object are the same, this is perfect because when we created
    // the node instance the same one was pushed to both arrays
    const index = this.allNodes.findIndex((x) => x === node);

    assert(index !== -1, `Fail to find node ${node.prettyKind}`);

    // const startIndex = index - 1;
    // TODO: Is this needed? Going back to the start of the expression, for example
    // 1 2 3
    // Given that all 3 numbers share the same parent expression, and we are located in number 2, we should include 1
    // The thing is that I'm pretty sure by the time we reach 2, 1 is already matched, this may change with the min LCS algo though

    // while (true) {
    //   const back = this.allNodes[startIndex]

    //   if (back?.expressionNumber !== expressionNumber) {
    //     break
    //   }

    //   startIndex++
    // }

    const expNodes: Node[] = [];
    let i = index; // startIndex;
    while (true) {
      const next = this.allNodes[i];

      // This means that we finished all nodes, exit
      if (!next) {
        break;
      }

      // The rule for including nodes is the following, an expression of depth X will include:
      // - Sibling nodes, of depth X
      // - Child and child of siblings of depth X + N

      // This means that going up (as of going up the tree), in this case having a smaller expression number, will be out exit condition
      if (next.expressionNumber < expressionNumber) {
        break;
      }

      // Only include text node that we haven't proceeded yet
      if (next.status === Status.unmatched && next.isTextNode) {
        expNodes.push(next);
      }

      i++;
    }

    return expNodes;
  }

  printList(nodesToPrint: "text" | "all" | Node[] = "text") {
    console.log(`${colorFn.blue("index")} | ${colorFn.magenta("match n°")} | ${colorFn.green("exp n°")} | ${colorFn.red("         kind          ")} | ${colorFn.yellow("text")}`);

    const list: string[] = [];

    const _nodes = Array.isArray(nodesToPrint) ? nodesToPrint : nodesToPrint === "text" ? this.textNodes : this.allNodes;

    for (const node of _nodes) {
      let colorFn;
      switch (node.status) {
        case Status.matched: {
          colorFn = k.green;
          break;
        }
        case Status.unmatched: {
          colorFn = k.grey;
          break;
        }
        case Status.skipped: {
          colorFn = k.white;
          break;
        }
        default: {
          colorFn = k.grey;
        }
      }

      const index = String(node.index).padStart(3).padEnd(6);

      const matchNumber = String(node.matchNumber).padStart(5).padEnd(10);
      const expressionNumber = String(node.expressionNumber ?? "-").padStart(5).padEnd(8);

      const { kind, text } = getNodeForPrinting(node);
      const _kind = kind.padStart(5).padEnd(25);
      const _text = ` ${text}`;

      const row = `${index}|${matchNumber}|${expressionNumber}|${colorFn(_kind)}|${_text}`;

      if (node.index === this.indexOfLastItem) {
        colorFn = k.yellow;
      }

      list.push(colorFn(row));
    }

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

  printDepth(nodesToPrint: "text" | "all" | Node[] = "text") {
    const _nodes = Array.isArray(nodesToPrint) ? nodesToPrint : nodesToPrint === "text" ? this.textNodes : this.allNodes;

    let res = "";
    for (const node of _nodes) {
      const shouldColorTextNode = nodesToPrint === "all" && node.isTextNode;

      const _colorFn = shouldColorTextNode ? colorFn.green : colorFn.grey;

      res += `
      (${node.expressionNumber + 1})${new Array(node.expressionNumber + 1).join("-")}${_colorFn(node.prettyKind)}`;
    }

    return res;
  }

  printPositionInfo() {
    console.log(`${colorFn.blue("index")} | ${colorFn.green("line")} | ${colorFn.white("trivia")} |  ${colorFn.magenta("pos")}  | ${colorFn.red("         kind          ")} | ${colorFn.yellow("text")}`);

    const list: string[] = [];

    for (const node of this.textNodes) {
      // TODO Copy above code
      let colorFn = k.grey//node.matched ? k.green : k.grey;

      const index = String(node.index).padStart(3).padEnd(6);

      const lineStart = node.lineNumberStart;
      const lineEnd = node.lineNumberEnd;
      const triviaLines = String(node.triviaLinesAbove).padStart(5).padEnd(8);

      const line = `${lineStart}-${lineEnd} `.padStart(5).padEnd(6);

      const pos = `${node.start}-${node.end}`.padStart(6).padEnd(7);

      const { kind, text } = getNodeForPrinting(node);
      const _kind = kind.padStart(5).padEnd(25);
      const _text = ` ${text}`;

      const row = `${index}|${line}|${triviaLines}|${pos}|${colorFn(_kind)}|${_text}`;

      if (node.index === this.indexOfLastItem) {
        colorFn = k.cyan;
      }

      list.push(colorFn(row));
    }

    console.log(list.join("\n"));
  }
}
