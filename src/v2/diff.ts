import { _context } from ".";
import { assert, fail } from "../debug";
import { Side } from "../shared/language";
import { Iterator } from "./iterator";
import { DiffType, TypeMasks } from "../types";
import { range, rangeEq } from "../utils";
import { Node } from "./node";
import { getIndexesFromSegment } from "./utils";
import { getBestMatch, isLatterCandidateBetter } from "./core";

// Start is inclusive, end is not inclusive
export type Segment = [indexA: number, indexB: number, length: number];

export interface CandidateMatch {
  length: number;
  skips: number;
  segments: Segment[];
}

export function getEmptyCandidate(): CandidateMatch {
  return {
    length: 0,
    segments: [],
    skips: 0,
  };
}

export class Change {
  startNode: Node;
  length: number;
  constructor(
    public type: DiffType,
    public segments: Segment[],
    public skips = 0
  ) {
    this.startNode = getStarterNode(type, segments);
    this.length = calculateCandidateMatchLength(segments);
  }

  static createAddition(node: Node) {
    assert(node.side === Side.b);
    return new Change(DiffType.addition, [
      [
        // Start A
        -1,
        // Start B
        node.index,
        // Length
        1,
      ],
    ]);
  }

  static createDeletion(node: Node) {
    assert(node.side === Side.a);
    return new Change(DiffType.deletion, [
      [
        // Start A
        node.index,
        // Start B
        -1,
        // Length
        1,
      ],
    ]);
  }

  static createMove(match: CandidateMatch) {
    return new Change(DiffType.move, match.segments, match.skips);
  }
}

// SCORE FN PARAMETERS
const MAX_NODE_SKIPS = 5;

export function getCandidateMatch(nodeA: Node, nodeB: Node): CandidateMatch {
  const segments: Segment[] = [];
  const { iterA, iterB } = _context;

  let segmentLength = 0;
  let skips = 0
  let skipsOnA = 0;
  let skipsOnB = 0;

  let currentASegmentStart = nodeA.index;
  let currentBSegmentStart = nodeB.index;

  let indexA = nodeA.index;
  let indexB = nodeB.index;

  assert(equals(nodeA, nodeB), () => "Misaligned matched");

  mainLoop: while (true) {
    // TODO-2 First iteration already has the nodes
    const nextA = iterA.next(indexA);
    const nextB = iterB.next(indexB);

    // If one of the iterators ends then there is no more search to do
    if (!nextA || !nextB) {
      segments.push([
        currentASegmentStart,
        currentBSegmentStart,
        segmentLength,
      ]);
      break mainLoop;
    }

    if (equals(nextA, nextB)) {
      segmentLength++;
      indexA++;
      indexB++;
      continue;
    }

    // We found a discrepancy. Before try to skip nodes to recover the match we record the current segment
    segments.push([currentASegmentStart, currentBSegmentStart, segmentLength]);
    segmentLength = 0

    let skipsInLookaheadB = 0

    const skipBUntil = Math.min(iterB.nodes.length - 1, indexB + MAX_NODE_SKIPS)

    for (const newIndexB of rangeEq(indexB, skipBUntil)) {
      const newB = iterB.next(newIndexB)

      if (!newB) {
        break mainLoop
      }

      let skipsInLookaheadA = 0
      // OJO + 1 ya 
      const skipAUntil = Math.min(iterA.nodes.length - 1, indexA + MAX_NODE_SKIPS)      
      lookaheadA: for (const newIndexA of rangeEq(indexA, skipAUntil)) {
        assert(newB)

        const newA = iterA.next(newIndexA)

        if (!newA) {
          break lookaheadA
        }

        if (equals(newA, newB)) {
          indexA = newIndexA
          indexB = newIndexB

          currentASegmentStart = newIndexA
          currentBSegmentStart = newIndexB

          skips += skipsInLookaheadA + skipsInLookaheadB
          continue mainLoop
        }

        skipsInLookaheadA++
      }

      skipsInLookaheadB++
    }
  }

  return {
    length: calculateCandidateMatchLength(segments),
    skips,
    segments,
  };
}

function equals(nodeOne: Node, nodeTwo: Node): boolean {
  return nodeOne.kind === nodeTwo.kind && nodeOne.text === nodeTwo.text;
}

export function calculateCandidateMatchLength(segments: Segment[]) {
  let sum = 0;

  for (const segment of segments) {
    sum += segment[2];
  }

  return sum;
}

function getStarterNode(type: DiffType, segments: Segment[]) {
  const { a, b } = getIndexesFromSegment(segments[0]);

  const iter = type & TypeMasks.AddOrMove ? _context.iterB : _context.iterA;
  const index = type & TypeMasks.AddOrMove ? b.start : a.start;

  const node = iter.nodes[index];

  assert(node, () => "Failed to get starter node");

  return node;
}

function exploreForward(
  indexA: number,
  indexB: number,
  skipOn: Side
): CandidateMatch {
  const ogIndexA = indexA;
  const ogIndexB = indexB;

  let sequenceLength = 0;
  let skips = 0;

  const { iterA, iterB } = _context;

  while (true) {
    const nextA = iterA.next(indexA);
    const nextB = iterB.next(indexB);

    if (!nextA || !nextB) {
      break;
    }

    if (equals(nextA, nextB)) {
      indexA++;
      indexB++;
      sequenceLength++;
      continue;
    }

    skips++;

    if (skips > MAX_NODE_SKIPS) {
      break;
    }

    if (skipOn === Side.a) {
      indexA++;
    } else {
      indexB++;
    }
  }

  return {
    segments: [[ogIndexA, ogIndexB, sequenceLength]],
    length: sequenceLength,
    skips,
  };
}
