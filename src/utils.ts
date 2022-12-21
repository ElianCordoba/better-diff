import { SyntaxKind } from "typescript";
import { Node } from "./node";
import { ts } from "./ts-util";
import { Range } from "./types";

export function formatSyntaxKind(kind: SyntaxKind, text?: string) {
  const textValue = text ? `| "${text}"` : "";
  const formattedKind = ts.Debug.formatSyntaxKind(kind);

  return `${formattedKind.padEnd(25)}${textValue}`.trim();
}

export function getNodeForPrinting(item: Node) {
  const hasText = item.text || "";
  const isString = item.kind === SyntaxKind.StringLiteral;

  let text;

  if (isString) {
    text = `"${hasText}"`;
  } else {
    text = hasText;
  }

  return {
    kind: ts.Debug.formatSyntaxKind(item.kind),
    text,
  };
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA.kind === nodeB.kind && nodeA.text === nodeB.text;
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
