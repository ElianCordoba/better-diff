import { Node } from "./node";
import { DiffType, TypeMasks } from "../types";
import { Segment } from "./types";
import { CandidateMatch } from "./match";
import { getIndexesFromSegment, getTextLengthFromSegments } from "./utils";
import { assert } from "../debug";
import { _context } from ".";

export class Change<Type extends DiffType = DiffType> {
  startNode: Node;
  textLength: number;
  constructor(
    public type: Type,
    public segments: Segment[],
    public skips = 0,
  ) {
    this.startNode = getStarterNode(type, segments);
    this.textLength = getTextLengthFromSegments(segments);
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

export type Move = Change<DiffType.move>;

function getStarterNode(type: DiffType, segments: Segment[]) {
  const { a, b } = getIndexesFromSegment(segments[0]);

  const iter = type & TypeMasks.AddOrMove ? _context.iterB : _context.iterA;
  const index = type & TypeMasks.AddOrMove ? b.start : a.start;

  const node = iter.nodes[index];

  assert(node, () => "Failed to get starter node");

  return node;
}
