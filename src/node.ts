import { SyntaxKind } from "typescript";
import { getNodeForPrinting } from "./utils";
import { ChangeType, Mode, Range, Side } from "./types";
import { _context } from ".";

interface NodeArgs {
  side: Side
  mode: Mode;
  fullStart: number;
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  numberOfNewlines: number
  triviaLinesAbove: number;
  lineNumberStart: number;
  lineNumberEnd: number;
  index?: number;
}

export class Node {
  side: Side;
  fullStart: number;
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  prettyKind: string;
  // How many new lines characters does the trivia of this node holds?
  numberOfNewlines: number
  triviaLinesAbove: number;
  lineNumberStart: number;
  lineNumberEnd: number;
  index = -1;
  matched = false;
  matchNumber = 0;
  canBeMatchedAlone = false;

  isOpeningNode = false;
  isClosingNode = false;

  // For printing proposes
  markedAs?: ChangeType;
  constructor(args: NodeArgs) {
    const { side, fullStart, start, end, kind, triviaLinesAbove, lineNumberStart, lineNumberEnd, text, mode, numberOfNewlines } = args;

    this.side = side
    this.fullStart = fullStart;
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

    this.triviaLinesAbove = triviaLinesAbove;
    this.lineNumberStart = lineNumberStart;
    this.lineNumberEnd = lineNumberEnd;
    this.numberOfNewlines = numberOfNewlines
  }

  getRange(): Range {
    return {
      start: this.start,
      end: this.end,
    };
  }

  draw() {
    const iter = _context[this.side === Side.a ? 'iterA' : 'iterB']

    iter.printRange(this)
  }
}
