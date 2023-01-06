import ts from "typescript";
import { Node } from "./node";

type TSNode = ts.Node & { text: string };

export function getNodesArray(source: string) {
  const sourceFile = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.ESNext,
    true,
  );

  const nodes: Node[] = [];
  let depth = 0;

  function walk(node: TSNode) {
    const hasText = typeof node.text !== "undefined" ? node.getText() : undefined;
    const isReservedWord = node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword;
    const isPunctuation = node.kind >= ts.SyntaxKind.FirstPunctuation && node.kind <= ts.SyntaxKind.LastPunctuation;

    // Only include visible node, nodes that represent some text in the source code.
    if (hasText || isReservedWord || isPunctuation) {
      // Each node owns the trivia before until the previous token, for example:
      //
      // age = 24
      //      ^
      //      Trivia for the number literal starts here, but you don't want to start the diff here
      //
      // This is why we add the leading trivia to the `start` of the node, so we get where the actual
      // value of the node starts and not where the trivia starts
      const fullStart = node.pos + node.getLeadingTriviaWidth();

      const lineNumberStart = getLineNumber(sourceFile, fullStart)
      const lineNumberEnd = getLineNumber(sourceFile, node.end)

      // Solely used for code alignment
      const triviaLinesAbove = lineNumberStart - getLineNumber(sourceFile, node.pos)

      nodes.push(new Node({ start: fullStart, end: node.end, kind: node.kind, text: node.getText(), triviaLinesAbove, lineNumberStart, lineNumberEnd }));
    }

    depth++;
    node.getChildren().forEach((x) => walk(x as TSNode));
    depth--;
  }

  sourceFile.getChildren().forEach((x) => walk(x as TSNode));

  // TODO(Perf): Maybe do this inside the walk.
  // Before returning the result we need process the data one last time.
  let i = 0;
  let currentDepth = 0;

  for (const node of nodes) {
    if (node.expressionNumber > currentDepth + 1) {
      node.expressionNumber = currentDepth + 1;
    }
    currentDepth = node.expressionNumber;

    node.index = i;

    i++;
  }

  return nodes;
}

// This wrapper exists because the underling TS function is marked as internal
function getLineNumber(sourceFile: ts.SourceFile, start: number) {
  // deno-lint-ignore no-explicit-any
  return (ts as any).getLineAndCharacterOfPosition(sourceFile, start).line + 1;
}
