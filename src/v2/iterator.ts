import { Node } from "./node";

export class Iterator {
  ast: Node
  nodesQueue: Node[];
  lastNode!: Node;

  constructor(ast: Node) {
    this.ast = ast;
    this.nodesQueue = [ast];
  }

  next(startFrom?: Node): Node | undefined {
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
}