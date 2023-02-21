import ts from "typescript";
import { Node } from "./node";
import { Range, Side } from "./types";
import { fail } from "./debug";

export function getPrettyKind(kind: number): string {
  // deno-lint-ignore no-explicit-any
  return (ts as any).Debug.formatSyntaxKind(kind);
}

export function getNodeForPrinting(kind: number, text: string | undefined) {
  const isString = kind === ts.SyntaxKind.StringLiteral;

  let _text = "";

  if (text) {
    if (isString) {
      _text = `"${text}"`;
    } else {
      _text = text;
    }
  }

  return {
    kind: getPrettyKind(kind),
    text: _text,
  };
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA?.kind === nodeB?.kind && nodeA?.text === nodeB?.text;
}

export function mergeRanges(currentRange: Range, newRange: Range) {
  return {
    start: Math.min(currentRange.start, newRange.start),
    end: Math.max(currentRange.end, newRange.end),
  };
}

export function* range(start: number, end: number) {
  let i = start - 1;

  while (i < end - 1) {
    i++;
    yield i;
  }
}

export function oppositeSide(side: Side): Side {
  return side === Side.a ? Side.b : Side.a;
}

export enum ClosingNodeGroup {
  Paren = "Paren",
  Brace = "Brace",
  Bracket = "Bracket",
}

export function getClosingNodeGroup(node: Node): ClosingNodeGroup {
  switch (node.kind) {
    case ts.SyntaxKind.OpenParenToken:
    case ts.SyntaxKind.CloseParenToken:
      return ClosingNodeGroup.Paren;

    case ts.SyntaxKind.OpenBraceToken:
    case ts.SyntaxKind.CloseBraceToken:
      return ClosingNodeGroup.Brace;

    case ts.SyntaxKind.OpenBracketToken:
    case ts.SyntaxKind.CloseBracketToken:
      return ClosingNodeGroup.Bracket;

    default:
      fail(`Unknown node kind ${node.prettyKind}`);
  }
}

// Given an opening node, you get back the closing one
export function getClosingNode({ kind, prettyKind }: Node): ts.SyntaxKind {
  switch (kind) {
    case ts.SyntaxKind.OpenBraceToken:
      return ts.SyntaxKind.CloseBraceToken;
    case ts.SyntaxKind.OpenBracketToken:
      return ts.SyntaxKind.CloseBracketToken;
    case ts.SyntaxKind.OpenParenToken:
      return ts.SyntaxKind.CloseParenToken;
    default: {
      fail(`Unknown kind ${prettyKind}`);
    }
  }
}
