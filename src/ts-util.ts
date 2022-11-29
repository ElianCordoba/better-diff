import _ts, { SyntaxKind } from "typescript";

declare namespace MYTS {
  // deno-lint-ignore no-explicit-any
  let Debug: any;
}
type TS = typeof MYTS & typeof _ts;
// deno-lint-ignore no-explicit-any
export const ts: TS = (_ts as any);

export type Node = _ts.Node & { text: string };

export function getNodesArray(source: string) {
  const sourceFile = _ts.createSourceFile(
    "source.ts",
    source,
    _ts.ScriptTarget.ESNext,
    true,
  );

  const nodes: Node[] = [];

  function walk(node: Node) {
    // TODO: https://github.com/ElianCordoba/better-diff/issues/7
    if (node.kind !== 348) {
      // { node, depth, scopeStart, scopeEnd }
      nodes.push(node);
      node.getChildren().forEach((x) => walk(x as Node));
    }
  }

  sourceFile.getChildren().forEach((x) => walk(x as Node));

  // Remove EOF to simplify things out. It contains trivia that appears broken in the diff if not treated separately
  //nodes.pop();
  // TODO: https://github.com/ElianCordoba/better-diff/issues/7
  return nodes.filter(({ kind }) => kind !== SyntaxKind.EndOfFileToken && kind !== SyntaxKind.SyntaxList);
}
