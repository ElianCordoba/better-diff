import { _context } from ".";
import { assert } from "../debug";
import { Side } from "../shared/language";
import { range } from "../utils";
import { CandidateMatch, Segment } from "./diff";
import { Iterator } from "./iterator";
import { Node } from "./node";

export class Context {
  // Iterators will get stored once they are initialize, which happens later on the execution
  iterA!: Iterator;
  iterB!: Iterator;

  constructor(
    public sourceA: string,
    public sourceB: string,
  ) {}
}

export function getAllNodesFromMatch(match: CandidateMatch, side = Side.b) {
  const iter = getIterFromSide(side);
  const readFrom = side === Side.a ? 0 : 1;

  const nodes: Node[] = [];
  for (const segment of match.segments) {
    const { start, end } = getIndexesFromSegment(segment)[side];

    for (const index of range(start, end)) {
      const node = iter.nodes[index];

      assert(node);

      nodes.push(node);
    }
  }

  return nodes;
}

export function getIterFromSide(side: Side): Iterator {
  return side === Side.a ? _context.iterA : _context.iterB;
}

export function getIndexesFromSegment(segment: Segment) {
  const [startA, startB, length] = segment;

  return {
    a: {
      start: startA,
      end: startA + length,
    },
    b: {
      start: startB,
      end: startB + length,
    },
  };
}

export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
