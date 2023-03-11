import ts, { SourceFile } from "typescript";
import { Node } from "./node";
import { assert } from "./debug";
import { k } from "./reporter";
import { getOptions } from ".";

type TSNode = ts.Node & { text: string };

export function getNodesArray(source: string) {
  const sourceFile = getSourceFile(source);

  const { warnOnInvalidCode } = getOptions();

  // deno-lint-ignore no-explicit-any
  if (warnOnInvalidCode && (sourceFile as any).parseDiagnostics.length > 0) {
    console.log(`
      ${k.yellow("Parse error found in the following code:")}
      "${source}"
    `);
  }

  const textNodes: Node[] = [];
  let depth = 0;

  function walk(node: TSNode) {
    const isReservedWord = node.kind >= ts.SyntaxKind.FirstKeyword && node.kind <= ts.SyntaxKind.LastKeyword;
    const isPunctuation = node.kind >= ts.SyntaxKind.FirstPunctuation && node.kind <= ts.SyntaxKind.LastPunctuation;

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

    // const leadingTriviaHasNewLine = node.getFullText().split("\n").length > 1;
    const triviaLinesAbove = 0//leadingTriviaHasNewLine ? getTriviaLinesAbove(source, lineNumberStart) : 0;

    const newNode = new Node({ fullStart: node.pos, start, end: node.end, kind: node.kind, text: node.getText(), lineNumberStart, lineNumberEnd, triviaLinesAbove });
    newNode.expressionNumber = depth;

    const isClosingNode = node.kind === ts.SyntaxKind.CloseBraceToken ||
      node.kind === ts.SyntaxKind.CloseBracketToken ||
      node.kind === ts.SyntaxKind.CloseParenToken;

    if (isClosingNode) {
      newNode.isClosingNode = true;
    }

    const isOpeningNode = node.kind === ts.SyntaxKind.OpenBraceToken ||
      node.kind === ts.SyntaxKind.OpenBracketToken ||
      node.kind === ts.SyntaxKind.OpenParenToken;

    if (isOpeningNode) {
      newNode.isOpeningNode = true;
    }

    const canBeMatchedAlone = getIfNodeCanBeMatchedAlone(node.kind);
    newNode.canBeMatchedAlone = canBeMatchedAlone;

    // Only include visible node, nodes that represent some text in the source code.
    if (node.text || isReservedWord || isPunctuation) {
      textNodes.push(newNode);
    }

    depth++;
    node.getChildren().forEach((x) => walk(x as TSNode));
    depth--;
  }

  sourceFile.getChildren().forEach((x) => walk(x as TSNode));

  // TODO(Perf): Maybe do this inside the walk.
  // Before returning the result we need process the data one last time.
  let i = 0;
  for (const node of textNodes) {
    node.index = i;

    i++;
  }

  // TODO: Store node kind in a table so that we can reuse it when finding sequences

  return textNodes;
}

function getSourceFile(source: string): SourceFile {
  return ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.ESNext,
    true,
  );
}

function getTriviaLinesAbove(source: string, startAt: number) {
  const lines = getArrayOrLines(source);

  // -1 because line numbers are 1-indexed
  // -1 because we need to start from the previous line
  let i = startAt - 1 - 1;

  let triviaLines = 0;

  // Iterate until there are positions to go back or we exit early
  while (i >= 0) {
    const prev = lines.at(i);

    if (prev?.trim() !== "") {
      break;
    }

    triviaLines++;

    // Go back further to keep checking previous lines
    i--;
  }

  return triviaLines;
}

// Returns an array of lines of code
export function getArrayOrLines(source: string) {
  const lineMap = getLineMap(source);

  const lines: string[] = [];

  // For each line, we cut the slice we need
  for (let i = 0; i < lineMap.length; i++) {
    // Cut starts where the line map indicates, including that position
    const lineStart = lineMap[i];
    // Cut ends either where the next line start, non inclusive or, if we are in the last line, we take the end of the string
    const lineEnd = lineMap[i + 1] || source.length + 1;

    const slice = source.slice(lineStart, lineEnd);
    lines.push(slice);
  }

  assert(lines.length === lineMap.length, "Line number and line map length didn't match");

  return lines;
}

// All the bellow defined functions are wrappers of TS functions. This is because the underling TS is marked as internal thus there is no type information available

// An array of the positions (of characters) at which the lines in the source code start, for example:
// [0, 1, 5, 10] means that the first line start at 0 and ends at 1 (non inclusive), next one start at 1 and ends at 5 and so on.
export function getLineMap(source: string): number[] {
  const sourceFile = getSourceFile(source);
  // deno-lint-ignore no-explicit-any
  return (ts as any).getLineStarts(sourceFile);
}

// Get the line number (1-indexed) of a given character
function getLineNumber(sourceFile: ts.SourceFile, pos: number) {
  // deno-lint-ignore no-explicit-any
  return (ts as any).getLineAndCharacterOfPosition(sourceFile, pos).line + 1;
}

function getIfNodeCanBeMatchedAlone(kind: number) {
  const isLiteral = kind >= ts.SyntaxKind.FirstLiteralToken && kind <= ts.SyntaxKind.LastLiteralToken;
  const isIdentifier = kind === ts.SyntaxKind.Identifier || kind === ts.SyntaxKind.PrivateIdentifier;
  const isTemplate = kind === ts.SyntaxKind.FirstTemplateToken || kind === ts.SyntaxKind.LastTemplateToken;
  const other = kind === ts.SyntaxKind.DebuggerKeyword;

  if (isLiteral || isIdentifier || isTemplate || other) {
    return true;
  } else {
    return false;
  }
}
