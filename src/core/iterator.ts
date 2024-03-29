import { getSequence } from "../utils";
import { getSourceWithChange } from "../backend/printer";
import { Node } from "../data_structures/node";
import { _context } from "..";
import { OpenCloseStack } from "../open_close_verifier";
import { KindTable, ParsedProgram, Side } from "../shared/language";
import colorFn from "kleur";
import { DiffType } from "../types";
import { getOppositeNodeKind } from "../frontend/typescript";
import { getNodeForPrinting } from "../debug";

export class Iterator {
  side: Side;
  matchNumber = 0;
  nodes: Node[];
  kindTable: KindTable;

  // Only read when printing nodes
  private indexOfLastItem = 0;

  constructor({ nodes, kindTable, side }: ParsedProgram) {
    this.side = side;
    this.nodes = nodes;
    this.kindTable = kindTable;
  }

  // Get the next unmatched node in the iterator, optionally after a given index
  next(startFrom?: number) {
    for (let i = startFrom ?? 0; i < this.nodes.length; i++) {
      const item = this.nodes[i];

      if (item.matched) {
        continue;
      }

      this.indexOfLastItem = i;
      return item;
    }
  }

  // Find the first closing node that matches the wanted kind
  findClosingNode(openNode: Node, startFrom = 0): Node | undefined {
    const closingNodeKind = getOppositeNodeKind(openNode);
    const stack = new OpenCloseStack(openNode);

    let i = startFrom;

    while (true) {
      const next = this.peek(i);
      i++;

      if (i > this.nodes.length) {
        break;
      }

      // Means that the node was matched
      if (!next) {
        continue;
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
    const item = this.nodes[index];

    if (!item || item.matched) {
      return;
    }

    return item;
  }

  mark(index: number, markedAs: DiffType, done = false) {
    // TODO: Should only apply for moves, otherwise a move, addition and move
    // will display 1 for the first move and 3 for the second
    this.matchNumber++;
    this.nodes[index].matched = true;
    this.nodes[index].matchNumber = this.matchNumber;
    this.nodes[index].markedAs = markedAs;

    // Optimization, done is only set to `true` when we are calling this from `oneSidedIteration`,  by that time we don't need to update the kindTable
    if (!done) {
      // We remove the index from the table so that:
      // - We don't need to check if the node is matched or not when we use it
      // - To improve performance, this way we have less nodes to check
      this.kindTable.get(this.nodes[index].kind)!.delete(index);
    }
  }

  markMultiple(startIndex: number, numberOfNodes: number, markAs: DiffType) {
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

    const candidateNodes = this.find(startOfSequence);

    if (!candidateNodes) {
      return [];
    }

    for (const candidateIndex of candidateNodes) {
      const node = this.nodes[candidateIndex];

      // If the start of the sequence doesn't match then we know it's not a candidate, skipping
      if (startOfSequence.text !== node.text) {
        continue;
      }

      // Take a slice of the desired length and compare it to the target
      const candidateSeq = getSequence(this, candidateIndex, sequenceLength);

      if (areSequencesIdentical(candidateSeq, targetSequence)) {
        // Push the index, we can retrieve the full sequence later
        candidates.push(candidateIndex);
        continue;
      }
    }

    return candidates;
  }

  find(targetNode: Node): number[] {
    const candidates: number[] = [];

    const rawCandidates = this.kindTable.get(targetNode.kind);

    if (!rawCandidates) {
      return [];
    }

    for (const candidateIndex of rawCandidates) {
      const node = this.nodes[candidateIndex];

      // No need to compare kinds since we got the nodes from the kind table
      if (targetNode.text !== node.text) {
        continue;
      }

      candidates.push(candidateIndex);
    }

    return candidates;
  }

  getLineNumber(index: number) {
    // TODO: Contemplate lineNumberStart !== lineNumberEnd
    return this.nodes[index].lineNumberStart;
  }

  printList(nodesToPrint?: Node[]) {
    console.log(`----------- SIDE ${this.side.toUpperCase()} -----------`);
    console.log(`${colorFn.blue("index")} | ${colorFn.magenta("match n°")} | ${colorFn.green("\/n n°")} | ${colorFn.red("         kind          ")} | ${colorFn.yellow("text")}`);

    const list: string[] = [];

    const _nodes = Array.isArray(nodesToPrint) ? nodesToPrint : this.nodes;

    for (const node of _nodes) {
      let color;
      switch (node.markedAs) {
        case DiffType.addition: {
          color = colorFn.green;
          break;
        }
        case DiffType.deletion: {
          color = colorFn.red;
          break;
        }
        case DiffType.move: {
          color = colorFn.blue;
          break;
        }
        default: {
          color = colorFn.grey;
        }
      }

      const index = String(node.index).padStart(3).padEnd(6);

      const matchNumber = String(node.matchNumber).padStart(5).padEnd(10);

      const { kind, text } = getNodeForPrinting(node.kind, node.text);
      const _kind = kind.padStart(5).padEnd(25);
      const _text = ` ${text}`;
      const newLines = String(node.numberOfNewlines).padStart(4).padEnd(7);

      const row = `${index}|${matchNumber}|${newLines}|${color(_kind)}|${_text}`;

      if (node.index === this.indexOfLastItem) {
        color = colorFn.yellow;
      }

      list.push(color(row));
    }

    console.log(list.join("\n"));
  }

  printRange(node: Node | undefined) {
    const source = this.side === Side.a ? _context.sourceA : _context.sourceB;
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

    const { start, end } = nodeToDraw.getRange();
    const result = getSourceWithChange(chars, start, end, colorFn.magenta);

    console.log(result.join(""));
  }
}

function areSequencesIdentical(seq1: Node[], seq2: Node[]): boolean {
  if (seq1.length !== seq2.length) {
    return false;
  }

  for (let i = 0; i < seq1.length; i++) {
    const a = seq1[i];
    const b = seq2[i];

    if (a.text === b.text) {
      continue;
    }

    return false;
  }

  return true;
}
