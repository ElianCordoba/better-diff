import _ts from "typescript";

declare namespace MYTS {
  let Debug: any
}
type TS = typeof MYTS & typeof _ts
export const ts: TS = (_ts as any);

export type Node = _ts.Node & { text: string }

function getScanner(source: string, skipTrivia = true) {
  const scanner = ts.createScanner(ts.ScriptTarget.ESNext, skipTrivia);

  scanner.setText(source);

  scanner.setOnError((message: _ts.DiagnosticMessage, length: number) => {
    console.error(message);
  });

  scanner.setScriptTarget(ts.ScriptTarget.ES5);
  scanner.setLanguageVariant(ts.LanguageVariant.Standard);

  return scanner;
}

export interface Token {
  kind: string;
  value: string;
  startPos: number;
  endPos: number;
}

export function tokenize(source: string): Token[] {
  const scanner = getScanner(source);

  const tokens: Token[] = []

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const kind = ts.Debug.formatSyntaxKind(token)
    const value = scanner.getTokenText()

    const startPos = scanner.getStartPos();
    token = scanner.scan()
    const endPos = scanner.getStartPos();

    tokens.push({ kind, value, startPos, endPos })
  }

  return tokens
}

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
