import { _context } from ".";
import { assert, fail } from "../debug";
import { Side } from "../shared/language";
import { Iterator } from "./iterator";
import { DiffType, TypeMasks } from "../types";
import { range } from "../utils";
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
  let skips = 0;

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

    // For example for
    //
    // 1 2 3 4 5
    // 1 2 X 4 5
    const resultA = exploreMatchBySkipping(iterA, nextA, nextB);
    const resultB = exploreMatchBySkipping(iterB, nextB, nextA);
    
    if (resultA.length === 0 && resultB.length === 0) {
      fail('0 both')
    }

    if (isLatterCandidateBetter(resultA, resultB)) {
      resumeWith(resultB)
    } else {
      resumeWith(resultA)
    }

    continue mainLoop;

    function exploreMatchBySkipping(
      iter: Iterator,
      startAfterNode: Node,
      wantedNode: Node
    ): CandidateMatch {
      let numberOfSkips = 0;

      // Start by skipping the current node
      const from = startAfterNode.index + 1;

      // Look until we reach the skip limit or the end of the iterator, whatever happens first
      const until = Math.min(
        startAfterNode.index + MAX_NODE_SKIPS,
        iter.nodes.length
      );

      let bestCandidate = getEmptyCandidate()

      for (const nextNodeIndex of range(from, until)) {
        numberOfSkips++;

        const newCandidate = iter.peek(nextNodeIndex);

        if (!newCandidate) {
          continue;
        }

        if (equals(newCandidate, wantedNode)) {
          let candidate: CandidateMatch;
          if (iter.side === Side.a) {
            assert(startAfterNode.side === Side.a)
            assert(wantedNode.side === Side.b)

            candidate = exploreForward(nextNodeIndex, wantedNode.index, iter.side)
          } else {
            assert(startAfterNode.side === Side.b)
            assert(wantedNode.side === Side.a)

            candidate = exploreForward(wantedNode.index, nextNodeIndex, iter.side)
          }

          if (isLatterCandidateBetter(bestCandidate, candidate)) {
            bestCandidate = candidate;
          }
        }
      }

      return bestCandidate;
    }

    function resumeWith(candidate: CandidateMatch) {
      const [startA, startB] = candidate.segments[0];
      currentASegmentStart = startA;
      currentBSegmentStart = startB;
      indexA = startA;
      indexB = startB;
      skips += candidate.skips;
      segmentLength = 0;
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
