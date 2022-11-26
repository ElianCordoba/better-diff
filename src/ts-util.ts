import _ts from "typescript";

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
    //nodes.push(ts.Debug.formatSyntaxKind(node.kind))
    nodes.push(node);

    // { node, depth, scopeStart, scopeEnd }

    node.getChildren().forEach((x) => walk(x as Node));
  }

  sourceFile.getChildren().forEach((x) => walk(x as Node));

  // Remove EOF to simplify things out. It contains trivia that appears broken in the diff if not treated separately
  nodes.pop();

  return nodes;
}
