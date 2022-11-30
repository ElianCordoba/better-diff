import _ts, { SyntaxKind } from "typescript";
import { formatSyntaxKind } from "./utils";

declare namespace MYTS {
  // deno-lint-ignore no-explicit-any
  let Debug: any;
}
type TS = typeof MYTS & typeof _ts;
// deno-lint-ignore no-explicit-any
export const ts: TS = (_ts as any);

export type Node = _ts.Node & { text: string; __prettyKind: string };

export function getNodesArray(source: string) {
  const sourceFile = _ts.createSourceFile(
    "source.ts",
    source,
    _ts.ScriptTarget.ESNext,
    true,
  );

  const nodes: Node[] = [];

  function walk(node: Node) {
    // TODO: Think about this data that we could: depth, scopeStart, scopeEnd
    node.__prettyKind = formatSyntaxKind(node);
    nodes.push(node);
    node.getChildren().forEach((x) => walk(x as Node));
  }

  sourceFile.getChildren().forEach((x) => walk(x as Node));

  // Remove EOF to simplify things out. It contains trivia that appears broken in the diff if not treated separately
  nodes.pop();

  // TODO: https://github.com/ElianCordoba/better-diff/issues/7
  return nodes.filter((x) => x.kind !== SyntaxKind.SyntaxList && x.kind !== SyntaxKind.ExpressionStatement);
}
