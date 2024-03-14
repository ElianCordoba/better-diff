import { Node } from "./node";
import { Side } from "../shared/language";
import { DiffType, TypeMasks } from "../types";
import { CandidateMatch, Segment } from "./types";
import { calculateCandidateMatchLength, getIndexesFromSegment } from "./utils";
import { assert } from "../debug";
import { _context } from ".";

export class Change {
  startNode: Node;
  length: number;
  constructor(
    public type: DiffType,
    public segments: Segment[],
    public skips = 0,
  ) {
    this.startNode = getStarterNode(type, segments);
    this.length = calculateCandidateMatchLength(segments);
  }

  static createAddition(node: Node) {
    assert(node.side === Side.b, () => "Trying to create a deletion but received an A side node");
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
    assert(node.side === Side.a, () => "Trying to create a deletion but received an B side node");
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

function getStarterNode(type: DiffType, segments: Segment[]) {
  const { a, b } = getIndexesFromSegment(segments[0]);

  const iter = type & TypeMasks.AddOrMove ? _context.iterB : _context.iterA;
  const index = type & TypeMasks.AddOrMove ? b.start : a.start;

  const node = iter.nodes[index];

  assert(node, () => "Failed to get starter node");

  return node;
}
