import { SyntaxKind } from "typescript";
import { DiffType, Mode, Range } from "../types";
import { _context } from "..";
import { Side } from "../shared/language";
import { getNodeForPrinting } from "../debug";

interface NodeArgs {
  side: Side;
  mode: Mode;
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  numberOfNewlines: number;
  lineNumberStart: number;
  lineNumberEnd: number;
  index?: number;
}

export class Node {
  side: Side;
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  prettyKind: string;
  // How many new lines characters does the trivia of this node holds?
  numberOfNewlines: number;
  lineNumberStart: number;
  lineNumberEnd: number;
  index = -1;
  matched = false;
  matchNumber = 0;
  canBeMatchedAlone = false;

  isOpeningNode = false;
  isClosingNode = false;

  // For printing proposes
  markedAs?: DiffType;
  constructor(args: NodeArgs) {
    const { side, start, end, kind, lineNumberStart, lineNumberEnd, text, mode, numberOfNewlines } = args;

    this.side = side;
    this.start = start;
    this.end = end;
    this.kind = kind;

    // Not calculating and allocating the pretty kind string greatly improves performance and memory consumption
    if (mode === Mode.debug) {
      const prettyKind = getNodeForPrinting(kind, text);
      this.prettyKind = `${prettyKind.text} ${prettyKind.kind}`;
    } else {
      this.prettyKind = "";
    }

    this.text = text;
    this.lineNumberStart = lineNumberStart;
    this.lineNumberEnd = lineNumberEnd;
    this.numberOfNewlines = numberOfNewlines;
  }

  getRange(): Range {
    return {
      start: this.start,
      end: this.end,
    };
  }

  getOffsettedLineNumber(read: "start" | "end" = "start") {
    const readFrom = read === "start" ? "lineNumberStart" : "lineNumberEnd";
    return _context.textAligner.getOffsettedLineNumber(this.side, this[readFrom]);
  }

  draw() {
    const iter = _context[this.side === Side.a ? "iterA" : "iterB"];

    iter.printRange(this);
  }
}
