import Table from "cli-table3";
import colorFn from "kleur";

import { _context } from ".";
import { getSourceWithChange } from "../backend/printer";
import { Side } from "../shared/language";
import { getTsNodes } from "./compilers";
import { Node } from "./node";
import { NodesTable } from "./types";
import { DiffType } from "../types";

export class Iterator {
  nodes: Node[];

  lastNodeVisited!: Node;

  source: string;
  side: Side;

  nodesTable: NodesTable;

  matchNumber = 0;

  constructor(source: string, side: Side) {
    this.side = side;
    this.source = source;
    const { nodesTable, nodes } = getTsNodes(source, side);

    this.nodes = nodes;

    this.nodesTable = nodesTable;
  }

  // Get the next unmatched node in the iterator, optionally after a given index
  next(index?: number) {
    const start = index ?? 0;
    for (let i = start; i < this.nodes.length; i++) {
      const node = this.nodes[i];

      if (node.matched) {
        continue;
      }

      return this.lastNodeVisited = node;
    }
  }

  peek(index: number) {
    const item = this.nodes[index];

    if (!item || item.matched) {
      return;
    }

    return item;
  }

  mark(index: number, markedAs: DiffType) {
    // TODO: Should only apply for moves, otherwise a move, addition and move
    // will display 1 for the first move and 3 for the second
    this.matchNumber++;
    this.nodes[index].matched = true;
    this.nodes[index].matchNumber = this.matchNumber;
    this.nodes[index].markedAs = markedAs;

    // TODO2: Maybe we can delete the node from the `nodesTable` so that the `getMatchingNodes` doesn't need to filter out the marked ones
    //this.nodesTable.get(this.nodes[index].kind)!.findIndex/()
  }

  getMatchingNodes(targetNode: Node) {
    const rawCandidates = this.nodesTable.get(targetNode.kind);

    if (!rawCandidates) {
      return [];
    }

    return rawCandidates.filter((x) => !x.matched && x.text === targetNode.text);
  }

  printNode(node: Node) {
    const source = this.side === Side.a ? _context.sourceA : _context.sourceB;
    const chars = source.split("");

    const { start, end } = node.getRange();

    const color = node.isTextNode ? colorFn.magenta : colorFn.yellow;
    const result = getSourceWithChange(chars, start, end, color);

    console.log(result.join(""));
  }

  printNodes() {
    const table = new Table({
      head: [
        colorFn.blue("Index"),
        colorFn.yellow("Text"),
        colorFn.red("Kind"),
      ],
      colAligns: ["center", "center", "center"],
    });

    for (const node of this.nodes) {
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

      table.push([
        color(node.index),
        color(node.text),
        color(node.prettyKind),
      ]);
    }

    console.log(table.toString());
  }
}
