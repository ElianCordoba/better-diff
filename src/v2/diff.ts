import { _context } from ".";
import { assert } from "../debug";
import { Side } from "../shared/language";
import { DiffType } from "../types";
import { range } from "../utils";
import { Node } from "./node";
import { getIndexesFromSegment } from "./utils";

// Start is inclusive, end is not inclusive
export type Segment = [indexA: number, indexB: number, length: number];

export interface CandidateMatch {
  length: number;
  skips: number;
  segments: Segment[];
}

export class Change {
  startNode: Node;
  length: number;
  constructor(
    public type: DiffType,
    public segments: Segment[],
    public skips = 0,
  ) {
    const { b } = getIndexesFromSegment(segments[0]);
    this.startNode = _context.iterA.nodes[b.start];
    this.length = calculateLength(segments);
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
    return new Change(DiffType.addition, [
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

export function findSegmentLength(
  nodeA: Node,
  nodeB: Node,
): { segments: Segment[]; skips: number; length: number } {
  const segments: Segment[] = [];
  const { iterA, iterB } = _context;

  let bestSequence = 1;
  let skips = 0;

  // Where the segment starts
  let segmentAStart = nodeA.index;
  let segmentBStart = nodeB.index;

  let indexA = nodeA.index;
  let indexB = nodeB.index;

  mainLoop: while (true) {
    // TODO-2 First iteration already has the nodes
    const nextA = iterA.next(indexA);
    const nextB = iterB.next(indexB);

    // If one of the iterators ends then there is no more search to do
    if (!nextA || !nextB) {
      segments.push([segmentAStart, segmentBStart, bestSequence]);
      break mainLoop;
    }

    // Here two things can happen, either the match continues so we keep on advancing the cursors
    if (equals(nextA, nextB)) {
      bestSequence++;
      indexA++;
      indexB++;
      continue;
    }

    // Or, we find a discrepancy. Before try to skip nodes to recover the match we record the current segment
    segments.push([segmentAStart, segmentBStart, bestSequence]);

    // TODO-2 This could be a source of Change type diff, maybe
    // "A B C" transformed into "A b C" where "B" changed into "b"
    // if (areNodesSimilar(nextA, nextB)) {
    //   continue
    // }

    // We will try match the current B node with the following N nodes on A

    let numberOfSkips = 0;

    // Look until we reach the skip limit or the end of the iterator, whatever happens first
    const lookForwardUntil = Math.min(
      indexA + MAX_NODE_SKIPS,
      iterA.nodes.length,
    );

    // Start by skipping the current node
    for (const nextIndexA of range(indexA + 1, lookForwardUntil)) {
      numberOfSkips++;

      const newCandidate = iterA.peek(nextIndexA)!;

      // We found a match, so we will resume the matching in a new segment from there
      if (equals(newCandidate, nextB)) {
        segmentAStart = nextIndexA;
        segmentBStart = indexB;
        indexA = nextIndexA;
        skips = numberOfSkips;
        continue mainLoop;
      }
    }

    // We didn't find a candidate after advancing the cursor, we are done
    break;
  }

  return {
    length: bestSequence,
    skips,
    segments,
  };
}

function equals(nodeOne: Node, nodeTwo: Node): boolean {
  return nodeOne.kind === nodeTwo.kind && nodeOne.text === nodeTwo.text;
}

function calculateLength(segments: Segment[]) {
  let sum = 0;

  for (const segment of segments) {
    sum += segment[2];
  }

  return sum;
}
