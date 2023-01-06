import { SyntaxKind } from "typescript";
import { formatSyntaxKind } from "./utils";

interface NodeArgs {
  // Position of the text presentation of the node
  start: number;
  end: number;

  // Kind of the node
  kind: SyntaxKind;

  // Text representation
  text: string;

  // Line number where the text is
  triviaLinesAbove: number;

  // Line number where the text is _including_ leading trivia. Solely used for code alignment since we may need to add alignment lines if the node owns new line trivia
  lineNumberStart: number;

  // Line number where the text ends. Mainly used for tagger templates since they can take more that one line
  lineNumberEnd: number;

  // Index of the node in the node list
  index?: number;
}

export class Node {
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
    const { start, triviaLinesAbove, end, kind, lineNumberStart, lineNumberEnd, text } = args;
    this.start = start;
    this.triviaLinesAbove = triviaLinesAbove;
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