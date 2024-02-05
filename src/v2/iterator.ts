import { _context } from ".";
import { getSourceWithChange } from "../backend/printer";
import { Side } from "../shared/language";
import { getAST } from "./compilers";
import { Node } from "./node";
import colorFn from "kleur";
import { NodesTable } from "./types";

export class Iterator {
  ast: Node;
  nodesQueue: Node[];
  lastNode!: Node;
  source: string;
  side: Side;

  nodesTable: NodesTable;

  constructor(source: string, side: Side) {
    this.side = side;
    this.source = source;
    const { ast, nodesTable } = getAST(source, side);

    this.ast = ast;
    this.nodesTable = nodesTable;

    this.nodesQueue = [ast];
  }

  next(_startFrom?: Node): Node | undefined {
    let nextNode;
    while (true) {
      nextNode = this._next(_startFrom);

      if (!nextNode) {
        if (this.ast.matched) {
          return undefined;
        } else {
          return this.lastNode = this.ast;
        }
      }

      if (nextNode.matched) {
        return this.next(nextNode);
      } else {
        this.lastNode = nextNode;
        return nextNode;
      }
    }
  }

  _next(_startFrom?: Node): Node | undefined {
    let current = _startFrom || this.lastNode;

    // Special case if we are in the first iteration, return the root node
    if (!current) {
      return this.ast;
    }

    // Node has children, lets go to the first one
    if (!current.isLeafNode()) {
      return current.children[0];
    }

    // If we are in a leaf node we need to
    // - Go to the sibling node, if exist, or
    // - Go up and find a sibling node there
    while (true) {
      const parent = current.parent;

      if (!parent) {
        return;
      }

      // We found a node with children, we need to check if there are any sibling remaining
      const currentNodeIndex = parent.children.findIndex((x) => x.id === current.id);
      const hasSibling = parent.children[currentNodeIndex + 1];

      if (hasSibling) {
        return hasSibling;
      }

      current = current.parent!;
    }
  }

  resetWalkingOrder() {
    this.lastNode = this.ast;
  }

  printNode(node: Node) {
    const source = this.side === Side.a ? _context.sourceA : _context.sourceB;
    const chars = source.split("");

    const { start, end } = node.getRange();

    const color = node.isLeafNode() ? colorFn.magenta : colorFn.yellow;
    const result = getSourceWithChange(chars, start, end, color);

    console.log(result.join(""));
  }
}
