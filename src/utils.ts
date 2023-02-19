import ts from "typescript";
import { Node } from "./node";
import { Range, Side } from "./types";
import { DebugFailure } from "./debug";

export function formatSyntaxKind(kind: ts.SyntaxKind, text?: string) {
  let textValue = text ? `| "${text}"` : "";
  // The cast is because the underling function is marked as internal and we don't get typings
  // deno-lint-ignore no-explicit-any
  const formattedKind = (ts as any).Debug.formatSyntaxKind(kind);

  textValue = textValue.replaceAll("\n", "");

  if (textValue.length > 50) {
    textValue = textValue.slice(0, 50) + "...";
  }

  return `${formattedKind.padEnd(25)} ${textValue}`.trim();
}

export function getNodeForPrinting(item: Node) {
  const hasText = item.text || "";
  const isString = item.kind === ts.SyntaxKind.StringLiteral;

  let text;

  if (isString) {
    text = `"${hasText}"`;
  } else {
    text = hasText;
  }

  return {
    // deno-lint-ignore no-explicit-any
    kind: (ts as any).Debug.formatSyntaxKind(item.kind),
    text,
  };
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA?.kind === nodeB?.kind && nodeA?.text === nodeB?.text;
}

export function listEnded(node: Node): boolean {
  return node.kind === ts.SyntaxKind.EndOfFileToken;
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

export function getRanges(range: Range | undefined) {
  return {
    start: range?.start || 0,
    end: range?.end || 0,
  };
}

export function oppositeSide(side: Side): Side {
  return side === Side.a ? Side.b : Side.a;
}

export enum ClosingNodeGroup {
  Paren = 'Paren',
  Brace = 'Brace',
  Bracket = 'Bracket'
}

export function getClosingNodeGroup(node: Node): ClosingNodeGroup {
  switch (node.kind) {
    case ts.SyntaxKind.OpenParenToken:
    case ts.SyntaxKind.CloseParenToken:
      return ClosingNodeGroup.Paren;

    case ts.SyntaxKind.OpenBraceToken:
    case ts.SyntaxKind.CloseBraceToken:
      return ClosingNodeGroup.Brace

    case ts.SyntaxKind.OpenBracketToken:
    case ts.SyntaxKind.CloseBracketToken:
      return ClosingNodeGroup.Bracket;

    default:
      throw new DebugFailure(`Unknown node kind ${node.prettyKind}`)
  }
}

// Given an opening node, you get back the closing one
export function getClosingNode({ kind, prettyKind }: Node): ts.SyntaxKind {
  switch (kind) {
    case ts.SyntaxKind.OpenBraceToken: return ts.SyntaxKind.CloseBraceToken;
    case ts.SyntaxKind.OpenBracketToken: return ts.SyntaxKind.CloseBracketToken;
    case ts.SyntaxKind.OpenParenToken: return ts.SyntaxKind.CloseParenToken;
    default: {
      throw new DebugFailure(`Unknown kind ${prettyKind}`)
    }
  }
}
