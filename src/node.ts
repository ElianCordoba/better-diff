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
  minLCS: number;
  index?: number;
}

export enum Status {
  unmatched = "unmatched",
  skipped = "skipped",
  matched = "matched"
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
  minLCS: number;
  index = -1;
  expressionNumber = -1;
  matchNumber = 0;
  isTextNode = false;
  status: Status = Status.unmatched
  constructor(args: NodeArgs) {
    const { fullStart, start, end, kind, triviaLinesAbove, lineNumberStart, lineNumberEnd, text, minLCS } = args;

    this.fullStart = fullStart;
    this.start = start;
    this.end = end;
    this.kind = kind;
    this.prettyKind = formatSyntaxKind(kind, text);
    this.text = text;
    this.minLCS = minLCS

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
