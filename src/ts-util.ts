import _ts, { SyntaxKind } from "typescript";
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
  prettyKind: string;
  expressionNumber: number;
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
  let expressionNumber = 0;
  let expressionMarked = true;

  function walk(node: Node, depth = 0) {
    const hasText = node.text;
    const isReservedWord = node.kind >= SyntaxKind.FirstKeyword && node.kind <= SyntaxKind.LastKeyword;
    const isPunctuation = node.kind >= SyntaxKind.FirstPunctuation && node.kind <= SyntaxKind.LastPunctuation;

    const extra = node.kind === SyntaxKind.VariableStatement

    const isExpression = node.kind >= SyntaxKind.ArrayLiteralExpression && node.kind <= SyntaxKind.SatisfiesExpression || extra

    if (isExpression) {
      expressionNumber++
      expressionMarked = false
    }

    // TODO: If we only need nodes with text representation, we can use the tokenizer and add the leading trivia as a property
    // Only include visible node, nodes that represent some text in the source code.
    if (hasText || isReservedWord || isPunctuation) {
      // Note, we don't spread the current node into a new variable because we want to preserve the prototype, so that we can use methods like getLeadingTriviaWidth
      node.prettyKind = formatSyntaxKind(node);
      node.depth = depth;

      if (!expressionMarked) {
        node.expressionNumber = expressionNumber
        expressionMarked = true
      }

      nodes.push(node);
    }

    depth++;
    node.getChildren().forEach((x) => walk(x as Node, depth));
  }

  sourceFile.getChildren().forEach((x) => walk(x as Node));

  return nodes;
}
