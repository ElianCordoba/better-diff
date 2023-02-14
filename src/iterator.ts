import { equals, getNodeForPrinting } from "./utils";
import { colorFn, getSourceWithChange, k } from "./reporter";
import { Node } from "./node";
import { Candidate, ChangeType } from "./types";
import { DebugFailure } from "./debug";
import { getOptions } from ".";

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

  mode: 'full' | 'inner' = 'full'
  bufferedNodesIndexes: number[] = [];

  constructor({ textNodes, allNodes }: InputNodes, options?: IteratorOptions) {
    this.textNodes = textNodes;
    this.allNodes = allNodes;
    this.name = options?.name;
    this.chars = options?.source?.split("");
  }

  next(startFrom?: number) {
    let res;
    if (startFrom === undefined && this.bufferedNodesIndexes.length) {
      bufferNodesLoop: for (const bufferedNodeIndex of this.bufferedNodesIndexes) {
        const bufferedNode = this.textNodes[bufferedNodeIndex]

        if (!bufferedNode.matched) {
          res = bufferedNode
          break bufferNodesLoop
        }
      }
    }

    // Return buffered node if found
    if (res) {
      return res
    }

    for (let i = startFrom ?? 0; i < this.textNodes.length; i++) {
      const item = this.textNodes[i];

      if (item.matched) {
        continue;
      }

      this.indexOfLastItem = i;
      return item;
    }

  }

  setInnerMode(indexesOfNodesToBuffer: number[]) {
    this.mode = 'inner'

    if (this.bufferedNodesIndexes.length) {
      throw new DebugFailure('Buffered nodes was not empty when trying to buffer new nodes')
    }

    this.bufferedNodesIndexes = indexesOfNodesToBuffer;
  }

  setFullMode() {
    this.mode = 'full'
    this.bufferedNodesIndexes = []
  }

  peek(index: number, skipMatched = true) {
    const item = this.textNodes[index];

    if (!item || (skipMatched && item.matched)) {
      return;
    }

    return item;
  }

  mark(index: number, markedAs: ChangeType) {
    // TODO: Should only apply for moves, otherwise a move, addition and move
    // will display 1 for the first move and 3 for the second
    this.matchNumber++;
    this.textNodes[index].matched = true;
    this.textNodes[index].matchNumber = this.matchNumber;
    this.textNodes[index].markedAs = markedAs

    // TODO: IDK if I should keep this
    if (this.bufferedNodesIndexes.length) {
      const _index = this.bufferedNodesIndexes.findIndex(x => x === index);

      if (_index !== -1) {
        this.bufferedNodesIndexes.splice(_index, 1)
      }
    }
  }

  bufferNodes(indexesOfNodesToBuffer: number[]) {
    if (this.bufferedNodesIndexes.length) {
      throw new DebugFailure('Buffered nodes was not empty when trying to buffer new nodes')
    }

    this.bufferedNodesIndexes = indexesOfNodesToBuffer;
  }

  hasBufferedNodes() {
    const hasBufferedNodes = this.bufferedNodesIndexes.some(x => !this.textNodes[x].matched)

    if (!hasBufferedNodes && this.bufferedNodesIndexes.length) {
      this.bufferedNodesIndexes = []
    }

    return hasBufferedNodes
  }

  getCandidates(
    expected: Node,
  ): Candidate[] {
    // This variable will hold the indexes of known nodes that match the node we are looking for.
    // We returns more than once in order to calculate the LCS from a multiple places and then take the best result
    const candidates: Candidate[] = [];

    // Start from the next node
    let offset = 0;

    const search = (startFrom: number): void => {
      const ahead = this.textNodes[startFrom + offset];
      const back = this.textNodes[startFrom - offset];

      // We checked everything and nothing was found, exit early
      if (!ahead && !back) {
        return;
      }

      const foundAhead = ahead && !ahead.matched && equals(expected, ahead);
      const foundBack = back && !back.matched && equals(expected, back);

      if (foundAhead || foundBack) {
        const index = foundAhead ? startFrom + offset : startFrom - offset;
        const expressionNumber = foundAhead ? ahead.expressionNumber : back.expressionNumber;

        candidates.push({ index, expressionNumber });
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
    if (!node) {
      throw new DebugFailure("Undefined node");
    }

    // Using === on two object with only return true if both object are the same, this is perfect because when we created
    // the node instance the same one was pushed to both arrays
    const index = this.allNodes.findIndex((x) => x === node);

    if (index === -1) {
      throw new DebugFailure(`Fail to find node ${node.prettyKind}`);
    }

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
    let i = index // startIndex;
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
      if (!next.matched && next.isTextNode) {
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
      let colorFn
      switch (node.markedAs) {
        case ChangeType.addition: {
          colorFn = k.green
          break
        }
        case ChangeType.deletion: {
          colorFn = k.red
          break
        }
        case ChangeType.move: {
          colorFn = k.blue
          break
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
      let colorFn = node.matched ? k.green : k.grey;

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
