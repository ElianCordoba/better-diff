import { SyntaxKind } from "typescript";
import { getNodeForPrinting } from "./utils";
import { ChangeType, Mode } from "./types";

interface NodeArgs {
  mode: Mode;
  fullStart: number;
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  triviaLinesAbove: number;
  lineNumberStart: number;
  lineNumberEnd: number;
  index?: number;
}

export class Node {
  fullStart: number;
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  prettyKind: string;
  triviaLinesAbove: number;
  lineNumberStart: number;
  lineNumberEnd: number;
  index = -1;
  expressionNumber = -1;
  matched = false;
  matchNumber = 0;
  canBeMatchedAlone = false;

  isOpeningNode = false;
  isClosingNode = false;

  // For printing proposes
  markedAs?: ChangeType;
  constructor(args: NodeArgs) {
    const { fullStart, start, end, kind, triviaLinesAbove, lineNumberStart, lineNumberEnd, text, mode } = args;

    this.fullStart = fullStart;
    this.start = start;
    this.end = end;
    this.kind = kind;

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
  }

  getPosition() {
    return {
      start: this.start,
      end: this.end,
    };
  }
}
