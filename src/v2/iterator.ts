import { _context } from ".";
import { getSourceWithChange } from "../backend/printer";
import { Side } from "../shared/language";
import { getAST } from "./compilers";
import { Node } from "./node";
import colorFn from "kleur";
import { NodesTable } from "./types";

export class Iterator {
  ast: Node
  nodesQueue: Node[];
  lastNode!: Node;
  source: string
  side: Side

  nodesTable: NodesTable

  constructor(source: string, side: Side) {
    this.side = side
    this.source = source
    const { ast, nodesTable } = getAST(source, side)

    this.ast = ast;
    this.nodesTable = nodesTable

    this.nodesQueue = [ast];
  }

  next(startFrom?: Node): Node | undefined {
    const nextNode = this._next(startFrom)

    // TODO: The first node could be matched already
    if (!nextNode) {
      this.lastNode = this.ast
      return this.ast
    }

    return nextNode
  }

  _next(startFrom?: Node): Node | undefined {
    if (startFrom) {
      return startFrom.next()
    }

    // If it's the first time `next` is called we start from the root
    if (!this.lastNode) {
      return this.lastNode = this.ast
    }

    // Otherwise we find the next in a breath-first order
    const nextNode = this.lastNode.next()

    if (!nextNode) {
      return undefined
    }

    return this.lastNode = nextNode
  }

  printNode(node: Node) {
    const source = this.side === Side.a ? _context.sourceA : _context.sourceB;
    const chars = source.split("");

    const { start, end } = node.getRange();

    const color = node.isLeafNode() ? colorFn.magenta : colorFn.yellow
    const result = getSourceWithChange(chars, start, end, color);

    console.log(result.join(""));
  }

}