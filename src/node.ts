import { SyntaxKind } from "typescript";

export class Node {
  constructor(
    public index: number,
    public start: number,
    public end: number,
    public kind: SyntaxKind,
    public text: string,
    public prettyKind: string,
    public expressionNumber: number,
    public lineNumber: number,
    public matched: boolean = false,
    public matchNumber: number = 0,
    getSourceFn?: () => string,
  ) {}

  getPosition() {
    return {
      start: this.start,
      end: this.end,
    };
  }
}
