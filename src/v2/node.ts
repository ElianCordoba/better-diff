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

  matched = false
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

  mark() {
    this.matched = true;
  }

  draw() {
    const iter = _context[this.side === Side.a ? "iterA" : "iterB"];

    iter.printNode(this);
  }
}