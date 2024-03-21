import { _context } from ".";
import { assert } from "../debug";
import { Side } from "../shared/language";
import { range, rangeEq } from "../utils";
import { Change } from "./change";
import { Iterator } from "./iterator";
import { Node } from "./node";
import { CandidateMatch, Segment } from "./types";

export class Context {
  // Iterators will get stored once they are initialize, which happens later on the execution

  constructor(
    public sourceA: string,
    public sourceB: string,
    public iterA: Iterator,
    public iterB: Iterator,
    public changes: Change[],
    public deletions: Segment[],
    public additions: Segment[],
  ) {}
}

export function equals(nodeOne: Node, nodeTwo: Node): boolean {
  return nodeOne.kind === nodeTwo.kind && nodeOne.text === nodeTwo.text;
}

/**
 * TODO: MAybe compute a score fn
 */
export function isLatterCandidateBetter(currentCandidate: CandidateMatch, newCandidate: CandidateMatch): boolean {
  if (newCandidate.textLength > currentCandidate.textLength) {
    return true;
  } else if (newCandidate.textLength < currentCandidate.textLength) {
    return false;
  }

  if (newCandidate.segments.length < currentCandidate.segments.length) {
    return true;
  } else if (newCandidate.segments.length < currentCandidate.segments.length) {
    return false;
  }

  return newCandidate.skips < currentCandidate.skips;
}

// This function iterate for all the nodes (on both side if needed) of the match adding up the text length
export function getTextLengthFromSegments(segments: Segment[]) {
  let sum = 0;

  for (const segment of segments) {
    const { a, b } = getIndexesFromSegment(segment)

    if (a.start !== -1) {
      for (const i of range(a.start, a.end)) {
        sum += _context.iterA.nodes[i].text.length
      }
    }

    if (b.start !== -1) {
      for (const i of range(b.start, b.end)) {
        sum += _context.iterB.nodes[i].text.length
      }
    }
  }

  assert(sum > 0, () => "Segment length is 0");

  return sum;
}

export function getEmptyCandidate(): CandidateMatch {
  return {
    textLength: 0,
    segments: [],
    skips: 0,
  };
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
