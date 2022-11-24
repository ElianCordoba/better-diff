import { SyntaxKind } from "typescript";
import { Node, ts } from "./ts-util";

export function formatSyntaxKind(data: { kind: SyntaxKind }) {
  return ts.Debug.formatSyntaxKind(data.kind);
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA.kind === nodeB.kind && nodeA.text === nodeB.text;
}

export function listEnded(node: Node): boolean {
  return node.kind === ts.SyntaxKind.EndOfFileToken;
}
