import _ts, { SourceFile, SyntaxKind } from "typescript";
import { Node } from "./node";
import { formatSyntaxKind } from "./utils";

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

  function walk(node: TSNode, expressionNumber = 0) {
    const hasText = node.text;
    const isReservedWord = node.kind >= SyntaxKind.FirstKeyword && node.kind <= SyntaxKind.LastKeyword;
    const isPunctuation = node.kind >= SyntaxKind.FirstPunctuation && node.kind <= SyntaxKind.LastPunctuation;

    const isElement = node.kind >= SyntaxKind.Block && node.kind <= SyntaxKind.MissingDeclaration;

    const isExpression = node.kind >= SyntaxKind.ArrayLiteralExpression && node.kind <= SyntaxKind.SatisfiesExpression || isElement; // || node.kind === SyntaxKind.SyntaxList

    if (isExpression) {
      expressionNumber++;
    } else {
      expressionNumber += 0.1;
    }

    // Only include visible node, nodes that represent some text in the source code.
    if (hasText || isReservedWord || isPunctuation) {
      const prettyKind = formatSyntaxKind(node);
      const lineNumber = getLineNumber(sourceFile, node.pos + node.getLeadingTriviaWidth());
      // TODO: Remove round for debugging
      const _expressionNumber = Math.round(expressionNumber);

      /// TODO: Store expression start and end?

      // Each node owns the trivia before until the previous token, for example:
      //
      // age = 24
      //      ^
      //      Trivia for the number literal starts here, but you don't want to start the diff here
      //
      // This is why we add the leading trivia to the `start` of the node, so we get where the actual
      // value of the node starts and not where the trivia starts
      const start = node.pos + node.getLeadingTriviaWidth();

      // TODO: The 0 is temporal, read more bellow
      nodes.push(new Node(0, start, node.end, node.kind, node.text, prettyKind, _expressionNumber, lineNumber));
    }

    node.getChildren().forEach((x) => walk(x as TSNode, expressionNumber));
  }

  sourceFile.getChildren().forEach((x) => walk(x as TSNode));

  // TODO(Perf): Calculate the index in the walk function so that we don't need to reiterate the list
  nodes.map((node, i) => {
    node.index = i;
  });

  return nodes;
}

// This wrapper exists because the underling TS function is marked as internal
function getLineNumber(sourceFile: SourceFile, start: number) {
  // deno-lint-ignore no-explicit-any
  return (_ts as any).getLineAndCharacterOfPosition(sourceFile, start).line + 1;
}
