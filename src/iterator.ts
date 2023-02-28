import { equals, getClosingNode, getNodeForPrinting } from "./utils";
import { colorFn, getSourceWithChange, k } from "./reporter";
import { Node } from "./node";
import { ChangeType, Side } from "./types";
import { getContext } from ".";
import { NodeMatchingStack } from "./sequence";
import { getNodesArray } from "./ts-util";

interface IteratorOptions {
  name: string;
  source: string;
}

export class Iterator {
  name: string;

  matchNumber = 0;
  public textNodes: Node[];

  // Only read when printing nodes
  private indexOfLastItem = 0;

  constructor({ source, name }: IteratorOptions) {
    this.textNodes = getNodesArray(source);
    this.name = name;
  }

  // Get the next unmatched node in the iterator, optionally after a given index
  next(startFrom?: number) {
    for (let i = startFrom ?? 0; i < this.textNodes.length; i++) {
      const item = this.textNodes[i];

      if (item.matched) {
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
      const next = this.peek(i);
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

  peek(index: number) {
    const item = this.textNodes[index];

    if (!item || item.matched) {
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
    this.textNodes[index].markedAs = markedAs;
  }

  markMultiple(startIndex: number, numberOfNodes: number, markAs: ChangeType) {
    let i = startIndex;
    while (i < startIndex + numberOfNodes) {
      this.mark(i, markAs);
      i++;
    }
  }

  findSequence(targetSequence: Node[]): number[] {
    const candidates: number[] = [];

    const startOfSequence = targetSequence[0];
    const sequenceLength = targetSequence.length;

    for (let i = 0; i < this.textNodes.length; i++) {
      const node = this.textNodes[i];

      // If the start of the sequence doesn't match then we know it's not a candidate, skipping
      if (node.matched || !equals(startOfSequence, node)) {
        continue;
      }

      // Take a slice of the desired length and compare it to the target
      const candidateSeq = this.textNodes.slice(i, i + sequenceLength);

      if (areSequencesIdentical(candidateSeq, targetSequence)) {
        // Push the index, we can retrieve the full sequence later
        candidates.push(i);

        // We can safely jump ahead to the next node after the already added candidate
        i += targetSequence.length - 1;
        continue;
      }

      i++;
    }

    return candidates;
  }

  printList(nodesToPrint?: Node[]) {
    console.log(`----------- SIDE ${this.name} -----------`);
    console.log(`${colorFn.blue("index")} | ${colorFn.magenta("match n°")} | ${colorFn.green("exp n°")} | ${colorFn.red("         kind          ")} | ${colorFn.yellow("text")}`);

    const list: string[] = [];

    const _nodes = Array.isArray(nodesToPrint) ? nodesToPrint : this.textNodes;

    for (const node of _nodes) {
      let colorFn;
      switch (node.markedAs) {
        case ChangeType.addition: {
          colorFn = k.green;
          break;
        }
        case ChangeType.deletion: {
          colorFn = k.red;
          break;
        }
        case ChangeType.move: {
          colorFn = k.blue;
          break;
        }
        default: {
          colorFn = k.grey;
        }
      }

      const index = String(node.index).padStart(3).padEnd(6);

      const matchNumber = String(node.matchNumber).padStart(5).padEnd(10);
      const expressionNumber = String(node.expressionNumber ?? "-").padStart(5).padEnd(8);

      const { kind, text } = getNodeForPrinting(node.kind, node.text);
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
    const source = this.name === Side.a ? getContext().sourceA : getContext().sourceB;
    const chars = source.split("");

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
    const result = getSourceWithChange(chars, start, end, colorFn.magenta);

    console.log(result.join(""));
  }

  printDepth() {
    let res = "";
    for (const node of this.textNodes) {
      const _colorFn = colorFn.grey;

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

      const { kind, text } = getNodeForPrinting(node.kind, node.text);
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

function areSequencesIdentical(seq1: Node[], seq2: Node[]): boolean {
  if (seq1.length !== seq2.length) {
    return false;
  }

  for (let i = 0; i < seq1.length; i++) {
    const a = seq1[i];
    const b = seq2[i];

    if (equals(a, b)) {
      continue;
    }

    return false;
  }

  return true;
}
