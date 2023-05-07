import ts, { SourceFile } from "typescript";
import { Node } from "./node";
import { assert } from "./debug";
import { k } from "./reporter";
import { _context, getOptions } from ".";
import { KindTable, Side } from "./types";

type TSNode = ts.Node & { text: string };

export function getNodesArray(side: Side, source: string): { nodes: Node[]; kindTable: KindTable } {
  const sourceFile = getSourceFile(source);

  const { warnOnInvalidCode, mode } = getOptions();

  // deno-lint-ignore no-explicit-any
  if (warnOnInvalidCode && (sourceFile as any).parseDiagnostics.length > 0) {
    console.log(`
      ${k.yellow("Parse error found in the following code:")}
      "${source}"
    `);
  }

  const nodes: Node[] = [];
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
    const lineNumberEnd = 0; // TODO ALIGNMENT = getLineNumber(sourceFile, node.end);

    const numberOfNewlines = node.getFullText().match(/\n/g)?.length || 0

    const newNode = new Node({
      mode,
      side,
      fullStart: node.pos,
      start,
      end: node.end,
      kind: node.kind,
      text: node.getText(),
      lineNumberStart,
      lineNumberEnd,
      numberOfNewlines
    });

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
      nodes.push(newNode);
    }

    node.getChildren().forEach((x) => walk(x as TSNode));
  }

  sourceFile.getChildren().forEach((x) => walk(x as TSNode));

  const kindTable: KindTable = new Map();

  const { lineMapNodeTable } = _context
  // const lineMap = getLineMap(source)

  // let lineNumber = 1
  // for (const startOfLine of lineMap) {
  //   lineMapNodeTable[side].set(lineNumber, startOfLine)
  //   lineNumber++
  // }

  // TODO(Perf): Maybe do this inside the walk.
  // Before returning the result we need process the data one last time.
  let i = 0;
  for (const node of nodes) {
    node.index = i;

    const currentValue = kindTable.get(node.kind);

    if (currentValue) {
      currentValue.add(i);
    } else {
      kindTable.set(node.kind, new Set([i]));
    }

    if (!lineMapNodeTable[side].has(node.lineNumberStart)) {
      lineMapNodeTable[side].set(node.lineNumberStart, node.end)
    }

    i++;
  }

  return {
    nodes,
    kindTable,
  };
}

function getSourceFile(source: string): SourceFile {
  return ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.ESNext,
    true,
  );
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
