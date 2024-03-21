import { Node } from "./node";
import { Side } from "../shared/language";
import { DiffType, TypeMasks } from "../types";
import { CandidateMatch, Segment } from "./types";
import { getTextLengthFromSegments, getIndexesFromSegment } from "./utils";
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
    this.length = getTextLengthFromSegments(segments);
  }

  static createAddition(segments: Segment[]) {
    assert(segments.length !== 0, () => "No segments received");
    return new Change(DiffType.addition, segments);
  }

  static createDeletion(segments: Segment[]) {
    assert(segments.length !== 0, () => "No segments received");
    return new Change(DiffType.deletion, segments);
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
