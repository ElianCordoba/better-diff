import _ts, { SourceFile, SyntaxKind } from "typescript";
import { Node } from "./node";

declare namespace MYTS {
  // deno-lint-ignore no-explicit-any
  let Debug: any;
}
type TS = typeof MYTS & typeof _ts;
// deno-lint-ignore no-explicit-any
export const ts: TS = (_ts as any);

export type TSNode = _ts.Node & { text: string };

export function getNodesArray(source: string) {
  const sourceFile = _ts.createSourceFile(
    "source.ts",
    source,
    _ts.ScriptTarget.ESNext,
    true,
  );

  const nodes: Node[] = [];
  const allNodes: Node[] = []
  let depth = 0

  function walk(node: TSNode) {
    const n = new Node({ start: 0, end: 0, kind: node.kind, text: 'no-text', lineNumber: -1, expressionNumber: depth })

    allNodes.push(n)
    const hasText = typeof node.text !== 'undefined' ? node.getText() : undefined;
    const isReservedWord = node.kind >= SyntaxKind.FirstKeyword && node.kind <= SyntaxKind.LastKeyword;
    const isPunctuation = node.kind >= SyntaxKind.FirstPunctuation && node.kind <= SyntaxKind.LastPunctuation;

    // Only include visible node, nodes that represent some text in the source code.
    if (hasText || isReservedWord || isPunctuation) {
      const lineNumber = getLineNumber(sourceFile, node.pos + node.getLeadingTriviaWidth());

      // Each node owns the trivia before until the previous token, for example:
      //
      // age = 24
      //      ^
      //      Trivia for the number literal starts here, but you don't want to start the diff here
      //
      // This is why we add the leading trivia to the `start` of the node, so we get where the actual
      // value of the node starts and not where the trivia starts
      const start = node.pos + node.getLeadingTriviaWidth();

      nodes.push(new Node({ start, end: node.end, kind: node.kind, text: hasText!, expressionNumber: depth, lineNumber }));
    }

    depth++
    node.getChildren().forEach((x) => walk(x as TSNode));
    depth--
  }

  sourceFile.getChildren().forEach((x) => walk(x as TSNode));

  // TODO(Perf): Calculate the index in the walk function so that we don't need to reiterate the list
  nodes.map((node, i) => {
    node.index = i;
  });

  function smoothDepth(nodes: Node[]) {
    const result: Node[] = [];

    let currentDepth = 0;
    for (const node of nodes) {
      if (node.expressionNumber > currentDepth + 1) {
        node.expressionNumber = currentDepth + 1;
      }
      currentDepth = node.expressionNumber;
      result.push(node);
    }

    return result;
  }

  const smoothenNodes = smoothDepth(nodes)

  return [smoothenNodes, allNodes];
}

// This wrapper exists because the underling TS function is marked as internal
function getLineNumber(sourceFile: SourceFile, start: number) {
  // deno-lint-ignore no-explicit-any
  return (_ts as any).getLineAndCharacterOfPosition(sourceFile, start).line + 1;
}