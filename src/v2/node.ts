import { getPrettyKind } from "../debug";
import { Segment, SyntaxKind } from "./types";
import { DiffType, Range } from "../types";
import { Side } from "../shared/language";
import { _context } from ".";
interface NewNodeArgs {
  side: Side;

  index: number;
  globalIndex: number;

  kind: SyntaxKind;
  text: string;

  start: number;
  end: number;

  parent: Node | undefined;
  isTextNode: boolean;
}

export class Node {
  side: Side;
  index: number;
  globalIndex: number;
  kind: SyntaxKind;
  text: string;
  start: number;
  end: number;
  parent: Node | undefined;
  isTextNode: boolean;

  matched = false;
  prettyKind: string;
  matchNumber = 0;
  // For printing proposes
  markedAs?: DiffType;

  constructor(args: NewNodeArgs) {
    const {
      side,
      index,
      globalIndex,
      kind,
      text,
      parent,
      start,
      end,
      isTextNode,
    } = args;

    this.side = side;
    this.index = index;
    this.globalIndex = globalIndex;
    this.kind = kind;
    this.text = text;
    this.start = start;
    this.end = end;
    this.parent = parent;
    this.isTextNode = isTextNode;

    this.prettyKind = getPrettyKind(kind);
  }

  getRange(): Range {
    return {
      start: this.start,
      end: this.end,
    };
  }

  getSegment(diffType: DiffType.addition | DiffType.deletion): Segment {
    if (diffType === DiffType.addition) {
      return [
        // Start A
        -1,
        // Start B
        this.index,
        // Length
        1,
      ];
    } else {
      return [
        // Start A
        this.index,
        // Start B
        -1,
        // Length
        1,
      ];
    }
  }

  mark() {
    this.matched = true;
  }

  draw() {
    const iter = _context[this.side === Side.a ? "iterA" : "iterB"];

    iter.printNode(this);
  }
}
