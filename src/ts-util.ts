import _ts, { createScanner, SyntaxKind } from "typescript";
import { formatSyntaxKind } from "./utils";

declare namespace MYTS {
  // deno-lint-ignore no-explicit-any
  let Debug: any;
}
type TS = typeof MYTS & typeof _ts;
// deno-lint-ignore no-explicit-any
export const ts: TS = (_ts as any);

interface ExtraNodeData {
  text: string;
  depth: number;
  __prettyKind: string
}
export type Node = _ts.Node & ExtraNodeData;

export function getNodesArray(source: string) {
  const sourceFile = _ts.createSourceFile(
    "source.ts",
    source,
    _ts.ScriptTarget.ESNext,
    true,
  );

  const nodes: Node[] = [];

  function walk(node: Node, depth = 0) {
    const hasText = node.text;
    const isReservedWord = node.kind >= SyntaxKind.FirstKeyword && node.kind <= SyntaxKind.LastKeyword
    const isPunctuation = node.kind >= SyntaxKind.FirstPunctuation && node.kind <= SyntaxKind.LastPunctuation

    // TODO: If we only need nodes with text representation, we can use the tokenizer and add the leading trivia as a property
    // Only include visible node, nodes that represent some text in the source code.
    if (hasText || isReservedWord || isPunctuation) {
      // Note, we don't spread the current node into a new variable because we want to preserve the prototype, so that we can use methods like getLeadingTriviaWidth
      node.__prettyKind = formatSyntaxKind(node);
      nodes.push(node);
      node.getChildren().forEach((x) => walk(x as Node));
    }

    depth++
    node.getChildren().forEach((x) => walk(x as Node, depth));
  }

  sourceFile.getChildren().forEach((x) => walk(x as Node));

  return nodes
}