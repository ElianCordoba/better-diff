import ts from "typescript";
import { Node } from "./data_structures/node";
import { DiffType, NewDiffInfo, Range } from "./types";
import { fail } from "./debug";
import { Iterator } from "./core/iterator";
import { prettyRenderFn } from "./backend/printer";
import { _context } from ".";
import { LCSResult } from "./core/find_diffs";
import { Side } from "./shared/language";

export function getPrettyChangeType(type: DiffType, withColor = false): string {
  const renderFn = withColor ? prettyRenderFn[type] : (i: string) => i;
  switch (type) {
    case DiffType.deletion:
      return renderFn("Deletion");
    case DiffType.addition:
      return renderFn("Addition");
    case DiffType.move:
      return renderFn("Move");
  }
}

export function getPrettyKind(kind: number): string {
  return (ts as any).Debug.formatSyntaxKind(kind);
}

export function getNodeForPrinting(kind: number, text: string | undefined) {
  const isString = kind === ts.SyntaxKind.StringLiteral;

  let _text = "";

  if (text) {
    if (isString) {
      _text = `"${text}"`;
    } else {
      _text = text;
    }
  }

  return {
    kind: getPrettyKind(kind),
    text: _text,
  };
}

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA.kind === nodeB.kind && nodeA.text === nodeB.text;
}

export function mergeRanges(currentRange: Range, newRange: Range) {
  return {
    start: Math.min(currentRange.start, newRange.start),
    end: Math.max(currentRange.end, newRange.end),
  };
}

export function* range(start: number, end: number) {
  let i = start - 1;

  while (i < end - 1) {
    i++;
    yield i;
  }
}

export function oppositeSide(side: Side): Side {
  return side === Side.a ? Side.b : Side.a;
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

export function normalize(iter: Iterator, lcs: LCSResult): LCSResult {
  const perspective = iter.side === Side.a ? Side.a : Side.b;

  return {
    bestSequence: lcs.bestSequence,
    indexA: perspective === Side.a ? lcs.indexA : lcs.indexB,
    indexB: perspective === Side.a ? lcs.indexB : lcs.indexA,
  };
}

export function getSequence(iter: Iterator, from: number, length: number): Node[] {
  return iter.nodes.slice(from, from + length);
}

export function getDataForChange(nodeOrInfo: Node | NewDiffInfo): NewDiffInfo {
  if (nodeOrInfo instanceof Node) {
    return {
      index: nodeOrInfo.index,
      range: nodeOrInfo.getRange(),
    };
  } else {
    return nodeOrInfo;
  }
}

export function arraySum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

export function getSideFromChangeType(type: DiffType): Side {
  switch (type) {
    case DiffType.deletion:
      return Side.a;
    case DiffType.addition:
      return Side.b;
    default:
      fail();
  }
}

export function getIterFromSide(side: Side): Iterator {
  return side === Side.a ? _context.iterA : _context.iterB;
}
