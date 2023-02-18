import { DebugFailure } from './debug'
import { Node } from './node'
import { getClosingNode } from './utils'

export class Stack {
  allowedKind: number[]
  values: Node[] = []

  constructor(openNode: Node) {
    const closeNodeKind = getClosingNode(openNode)
    this.allowedKind = [openNode.kind, closeNodeKind]
    this.values = [openNode]

  }

  add(node: Node) {
    if (!this.allowedKind.includes(node.kind)) {
      // TODO use pretty kind
      throw new DebugFailure('Invalid kind provided')
    }

    if (node.isOpeningNode) {
      this.values.push(node)
    } else {
      this.values.pop()
    }
  }


  isEmpty() {
    return this.values.length === 0
  }
}