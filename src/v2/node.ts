import { getPrettyKind } from "../debug";
import { SyntaxKind } from "./types";
import { Range } from '../types'
import { Side } from "../shared/language";
import { _context } from ".";
interface NewNodeArgs {
  side: Side
  id: number;
  kind: SyntaxKind;
  text: string;

  start: number;
  end: number

  parent: Node | undefined;
}

export class Node {
  side: Side
  id: number;
  kind: SyntaxKind;
  text: string;
  start: number;
  end: number
  parent: Node | undefined;
  children: Node[] = []

  prettyKind: string;

  constructor(args: NewNodeArgs) {
    const { side, id, kind, text, parent, start, end } = args

    this.side = side
    this.id = id;
    this.kind = kind;
    this.text = text;
    this.start = start
    this.end = end
    this.parent = parent

    this.prettyKind = getPrettyKind(kind)

  }

  isLeafNode() {
    return this.children.length === 0;
  }

  getRange(): Range {
    return {
      start: this.start,
      end: this.end,
    };
  }

  /*
  Given the following AST:

                      1
                    /  \
                  2     5
                /  \
              3     4
  Steps:
    - Start by return "2"
    - Return "2" as it's the first children
    - "2" is not a leaf node, return the first child, "3"
    - "3" is a leaf node, go back to "2" passing it's id. We find that there is a sibling, return "4"
    - "4" is a leaf node, go back to "2" passing it's id. No more siblings are found, call next in the parent "1", there the next sibling is "5"
    - No more node, ended iteration
  */

  next(startAfterNodeId?: number): Node | undefined {
    // Case 1: Go back to the parent
    if (this.isLeafNode()) {
      return this.parent!.next(this.id)
    }

    // Case 2: We come from the parent
    if (startAfterNodeId) {
      const previousIndex = this.children.findIndex(a => a.id === startAfterNodeId)
      const hasNext = this.children[previousIndex + 1]

      if (hasNext) {
        // Case 2a: There was a sibling
        return hasNext
      } else {
        // Case 2b: There was no sibling
        return this.parent?.next(this.id)
      }
    }

    // Case 3: Return first children
    return this.children[0]
  }

  draw() {
    const iter = _context[this.side === Side.a ? "iterA" : "iterB"];

    iter.printNode(this);
  }
}