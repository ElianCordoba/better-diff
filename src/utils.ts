import { SyntaxKind } from "typescript";
import { Node } from "./node";
import { ts, TSNode } from "./ts-util";
import { Item, Range } from "./types";

export function formatSyntaxKind(node: TSNode) {
  const textValue = node.text ? `| "${node.text}"` : "";
  const kind: string = ts.Debug.formatSyntaxKind(node.kind);

  return `${kind.padEnd(25)}${textValue}`.trim();
}

export function getNodeForPrinting(item: Item) {
  const hasText = item.node.text || "";
  const isString = item.node.kind === SyntaxKind.StringLiteral;

  let text;

  if (isString) {
    text = `"${hasText}"`;
  } else {
    text = hasText;
  }

  return {
    kind: ts.Debug.formatSyntaxKind(item.node.kind),
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
