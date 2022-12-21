import { SyntaxKind } from "typescript";
import { formatSyntaxKind } from "./utils";

interface NodeArgs {
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  expressionNumber: number;
  lineNumber: number;
  index?: number;
}

export class Node {
  index: number = -1;
  start: number;
  end: number;
  kind: SyntaxKind;
  text: string;
  prettyKind: string;
  expressionNumber: number;
  lineNumber: number;
  matched: boolean = false;
  matchNumber: number = 0;
  //getSourceFn?: () => string,
  constructor(args: NodeArgs) {
    const { start, end, kind, expressionNumber, lineNumber, text } = args;
    this.start = start;
    this.end = end;
    this.kind = kind;
    this.prettyKind = formatSyntaxKind(kind, text);
    this.text = text;

    this.expressionNumber = expressionNumber;
    this.lineNumber = lineNumber
  }

  getPosition() {
    return {
      start: this.start,
      end: this.end,
    };
  }
}
