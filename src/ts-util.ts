import _ts, { SourceFile, SyntaxKind } from "typescript";
import { formatSyntaxKind } from "./utils";

declare namespace MYTS {
  // deno-lint-ignore no-explicit-any
  let Debug: any;
}
type TS = typeof MYTS & typeof _ts;
// deno-lint-ignore no-explicit-any
export const ts: TS = (_ts as any);

interface ExtraNodeData {
  index: number;
  text: string;
  depth: number;
  prettyKind: string;
  expressionNumber: number;
  lineNumber: number;
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

  function walk(node: Node, depth = 0, expressionNumber = 0) {
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

    // TODO: If we only need nodes with text representation, we can use the tokenizer and add the leading trivia as a property
    // Only include visible node, nodes that represent some text in the source code.
    if (hasText || isReservedWord || isPunctuation) {
      // Note, we don't spread the current node into a new variable because we want to preserve the prototype, so that we can use methods like getLeadingTriviaWidth
      node.prettyKind = formatSyntaxKind(node);
      node.depth = depth;

      node.lineNumber = getLineNumber(sourceFile, node.pos + node.getLeadingTriviaWidth());
      // TODO: Remove round for debugging
      node.expressionNumber = Math.round(expressionNumber);
      //node.expressionNumber = expressionNumber
      /// TODO: Store expression start and end?

      nodes.push(node);
    }

    depth++;
    node.getChildren().forEach((x) => walk(x as Node, depth, expressionNumber));
  }

  sourceFile.getChildren().forEach((x) => walk(x as Node));

  // TODO(Perf): Calculate the index in the walk function so that we don't need to reiterate the list
  nodes.map((node, i) => {
    node.index = i;
  });

  return nodes;
}

// This wrapper exists because the underling TS function is marked as internal
function getLineNumber(sourceFile: SourceFile, start: number) {
  return (_ts as any).getLineAndCharacterOfPosition(sourceFile, start).line + 1;
}
