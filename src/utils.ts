import ts from "typescript";
import { Node } from "./node";
import { Range } from "./types";

export function formatSyntaxKind(kind: ts.SyntaxKind, text?: string) {
  const textValue = text ? `| "${text}"` : "";
  // The cast is because the underling function is marked as internal and we don't get typings
  // deno-lint-ignore no-explicit-any
  const formattedKind = (ts as any).Debug.formatSyntaxKind(kind);

  return `${formattedKind.padEnd(25)}${textValue}`.trim();
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