import { SyntaxKind } from "typescript";
import { formatSyntaxKind } from "./utils";

interface NodeArgs {
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
  //getSourceFn?: () => string,
  constructor(args: NodeArgs) {
    const { fullStart, start, end, kind, triviaLinesAbove, lineNumberStart, lineNumberEnd, text } = args;

    this.fullStart = fullStart;
    this.start = start;
    this.end = end;
    this.kind = kind;
    this.prettyKind = formatSyntaxKind(kind, text);
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
