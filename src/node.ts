import { SyntaxKind } from "typescript";
import { formatSyntaxKind } from "./utils";

interface NodeArgs {
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  lineNumberStart: number;
  lineNumberEnd: number;
  index?: number;
}

export class Node {
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  prettyKind: string;
  lineNumberStart: number;
  lineNumberEnd: number;
  index = -1;
  expressionNumber = -1;
  matched = false;
  matchNumber = 0;
  //getSourceFn?: () => string,
  constructor(args: NodeArgs) {
    const { start, end, kind, lineNumberStart, lineNumberEnd, text } = args;
    this.start = start;
    this.end = end;
    this.kind = kind;
    this.prettyKind = formatSyntaxKind(kind, text);
    this.text = text;

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
