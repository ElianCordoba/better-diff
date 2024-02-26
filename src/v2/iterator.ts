import { _context } from ".";
import { getSourceWithChange } from "../backend/printer";
import { Side } from "../shared/language";
import { getTsNodes } from "./compilers";
import { Node } from "./node";
import colorFn from "kleur";
import { NodesTable } from "./types";

export class Iterator {
  nodes: Node[]

  lastNodeVisited!: Node;

  source: string;
  side: Side;

  nodesTable: NodesTable;

  constructor(source: string, side: Side) {
    this.side = side;
    this.source = source;
    const { nodesTable, nodes } = getTsNodes(source, side);

    this.nodes = nodes

    this.nodesTable = nodesTable;
  }

   // Get the next unmatched node in the iterator, optionally after a given index
   next(index?: number) {
    const start = index ?? 0
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

  getMatchingNodes(targetNode: Node) {
    const rawCandidates = this.nodesTable.get(targetNode.kind);

    if (!rawCandidates) {
      return [];
    }

    return rawCandidates.filter(x => x.text === targetNode.text);
  }

  printNode(node: Node) {
    const source = this.side === Side.a ? _context.sourceA : _context.sourceB;
    const chars = source.split("");

    const { start, end } = node.getRange();

    const color = node.isTextNode ? colorFn.magenta : colorFn.yellow;
    const result = getSourceWithChange(chars, start, end, color);

    console.log(result.join(""));
  }
}
