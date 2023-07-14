import { Node } from "./data_structures/node";
import { Iterator } from "./core/iterator";
import { _context } from ".";
import { LCSResult } from "./core/find_diffs";
import { Side } from "./shared/language";

export function equals(nodeA: Node, nodeB: Node) {
  return nodeA.kind === nodeB.kind && nodeA.text === nodeB.text;
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

export function arraySum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

export function getIterFromSide(side: Side): Iterator {
  return side === Side.a ? _context.iterA : _context.iterB;
}