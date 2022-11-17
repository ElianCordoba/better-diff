import _ts from "typescript";

declare namespace MYTS {
  let Debug: any
}
type TS = typeof MYTS & typeof _ts
export const ts: TS = (_ts as any);

export type Node = _ts.Node & { text: string }

export function getNodesArray(source: string) {
  const sourceFile = _ts.createSourceFile(
    "source.ts",
    source,
    _ts.ScriptTarget.ESNext,
    true
  );

  let tokens: Node[] = []

  function walk(node: Node) {
    //tokens.push(ts.Debug.formatSyntaxKind(node.kind))
    tokens.push(node)

    // { node, depth, scopeStart, scopeEnd }

    node.getChildren().forEach(x => walk(x as Node))
  }

  sourceFile.getChildren().forEach(x => walk(x as Node))

  return tokens
}
