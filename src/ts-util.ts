import ts, { SourceFile } from "typescript";
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
      const start = node.pos + node.getLeadingTriviaWidth();

      const lineNumberStart = getLineNumber(sourceFile, start);
      const lineNumberEnd = getLineNumber(sourceFile, node.end);

      nodes.push(new Node({ fullStart: node.pos, start, end: node.end, kind: node.kind, text: hasText!, lineNumberStart: lineNumberStart, lineNumberEnd }));
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

// Returns an array of lines of code in a TS style, by breaking the line before the new line, this way all the trivia at the start
// of the line belongs to the first node, for example:
// 
// Code: `
// // New line
// 123
// // New line
// `
//
// Escaped code:
// "\n// New line\n1\n// New line\n"
//
// If we cut at the new line location, the result would be:
// [
//   "\n",
//   "// New line\n",
//   "1\n",
//   "// New line\n",
//   "",
// ]
//
// But if we cut at the new line location minus one, then we get the desired result:
// [
//   "",
//   "\n// New line",
//   "\n1",
//   "\n// New line",
//   "\n",
// ]
export function getArrayOrLines(source: string) {
  const sourceFile = ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.ESNext,
    true,
  );

  const lineMap = getLineMap(sourceFile)

  const lines: string[] = []

  // For each line, we cut the slice we need
  for (let i = 0; i < lineMap.length; i++) {
    // Cut starts where the line map indicates, including that position
    const lineStart = lineMap[i];
    // Cut ends either where the next line start, non inclusive or, if we are in the last line, we take the end of the string
    const lineEnd = lineMap[i + 1] || source.length + 1

    // const start = lineStart - 1 < 0 ? 0 : lineStart - 1
    // const end = lineEnd - 1
    // const slice = source.slice(start, end)

    const slice = source.slice(lineStart, lineEnd)
    lines.push(slice)
  }

  if (lines.length !== lineMap.length) {
    throw new Error("Assertion failed")
  }

  return lines
}

// All the bellow defined functions are wrappers of TS functions. This is because the underling TS is marked as internal thus there is no type information available

// An array of the positions (of characters) at which the lines in the source code start, for example:
// [0, 1, 5, 10] means that the first line start at 0 and ends at 1 (non inclusive), next one start at 1 and ends at 5 and so on.
function getLineMap(sourceFile: SourceFile): number[] {
  // deno-lint-ignore no-explicit-any
  return (ts as any).getLineStarts(sourceFile)
}

// Get the line number (1-indexed) of a given character
function getLineNumber(sourceFile: ts.SourceFile, pos: number) {
  // deno-lint-ignore no-explicit-any
  return (ts as any).getLineAndCharacterOfPosition(sourceFile, pos).line + 1;
}
