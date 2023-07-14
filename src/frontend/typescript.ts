import ts from "typescript";
import { Node } from "../data_structures/node";
import { _context, _options } from "..";
import { getIfNodeCanBeMatchedAlone, getLineMap, getLineNumber, getSourceFile } from "./utils";
import { KindTable, ParsedProgram, Side } from "../shared/language";
import colorFn from "kleur";
import { fail } from "../debug";

type TSNode = ts.Node & { text: string };

export function getParsedProgram(side: Side, source: string): ParsedProgram {
  const sourceFile = getSourceFile(source);

  const { warnOnInvalidCode, mode } = _options;

  if (warnOnInvalidCode && (sourceFile as any).parseDiagnostics.length > 0) {
    console.log(`
      ${colorFn.yellow("Parse error found in the following code:")}
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
    const lineNumberEnd = getLineNumber(sourceFile, node.end);

    const numberOfNewlines = node.getFullText().match(/\n/g)?.length || 0;

    const newNode = new Node({
      mode,
      side,
      start,
      end: node.end,
      kind: node.kind,
      text: node.getText(),
      lineNumberStart,
      lineNumberEnd,
      numberOfNewlines,
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

  const lineMap = _context.textAligner.getLineMap(side);

  const nodesPerLine: Map<number, Set<number>> = new Map();

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

    const line = node.lineNumberStart;

    if (nodesPerLine.has(line)) {
      nodesPerLine.get(line)!.add(node.index);
    } else {
      nodesPerLine.set(line, new Set([node.index]));
    }

    i++;
  }

  const name = side === Side.a ? "nodesPerLineA" : "nodesPerLineB";
  for (const [lineNumber, nodes] of nodesPerLine) {
    _context.textAligner[name].set(lineNumber, nodes.size);
  }

  const fullLineMap = getLineMap(source);

  let lineNumber = 1;
  for (const startOfLine of fullLineMap) {
    if (!lineMap.has(lineNumber)) {
      lineMap.set(lineNumber, startOfLine);
    }

    lineNumber++;
  }

  // TODO-NOW enable?
  // _context.textAligner.sortLineMap(side);

  return {
    nodes,
    kindTable,
    side,
  };
}

export function getOppositeNodeKind({ kind, prettyKind }: Node): number {
  switch (kind) {
    // {
    case ts.SyntaxKind.OpenBraceToken:
      return ts.SyntaxKind.CloseBraceToken;
    // }
    case ts.SyntaxKind.CloseBraceToken:
      return ts.SyntaxKind.OpenBraceToken;
    // [
    case ts.SyntaxKind.OpenBracketToken:
      return ts.SyntaxKind.CloseBracketToken;
    // ]
    case ts.SyntaxKind.CloseBracketToken:
      return ts.SyntaxKind.OpenBracketToken;
    // (
    case ts.SyntaxKind.OpenParenToken:
      return ts.SyntaxKind.CloseParenToken;
    // )
    case ts.SyntaxKind.CloseParenToken:
      return ts.SyntaxKind.OpenParenToken;

    default: {
      fail(`Unknown kind ${prettyKind}`);
    }
  }
}

export enum ClosingNodeGroup {
  Paren = "Paren",
  Brace = "Brace",
  Bracket = "Bracket",
}

export function getClosingNodeGroup(node: Node): ClosingNodeGroup {
  switch (node.kind) {
    case ts.SyntaxKind.OpenParenToken:
    case ts.SyntaxKind.CloseParenToken:
      return ClosingNodeGroup.Paren;

    case ts.SyntaxKind.OpenBraceToken:
    case ts.SyntaxKind.CloseBraceToken:
      return ClosingNodeGroup.Brace;

    case ts.SyntaxKind.OpenBracketToken:
    case ts.SyntaxKind.CloseBracketToken:
      return ClosingNodeGroup.Bracket;

    default:
      fail(`Unknown node kind ${node.prettyKind}`);
  }
}
