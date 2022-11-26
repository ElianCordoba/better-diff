import { Node, ts } from "./ts-util";
import { Range } from "./types";

// deno-lint-ignore no-explicit-any
export function formatSyntaxKind(data: any) {
  const textValue = data.text ? `| "${data.text}"` : "";
  const kind: string = ts.Debug.formatSyntaxKind(data.kind);

  return `${kind.padEnd(25)} ${textValue}`.trim();
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA.kind === nodeB.kind && nodeA.text === nodeB.text;
}

export function listEnded(node: Node): boolean {
  return node.kind === ts.SyntaxKind.EndOfFileToken;
}

export function getRange(node: Node): Range {
  return {
    // Each node owns the trivia before until the previous token, for example:
    //
    // age = 24
    //      ^
    //      Trivia for the number literal starts here, but you don't want to start the diff here
    //
    // This is why we add the leading trivia to the `start` of the node, so we get where the actual
    // value of the node starts and not where the trivia starts
    start: node.pos + node.getLeadingTriviaWidth(),
    end: node.end,
  };
}

export function mergeRanges(currentRange: Range, newRange: Range) {
  return {
    start: Math.min(currentRange.start, newRange.start),
    end: Math.max(currentRange.end, newRange.end)
  }
}