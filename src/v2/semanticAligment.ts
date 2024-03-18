import { applyAlignments } from "../backend/printer";
import { Side } from "../shared/language";
import { DiffType } from "../types";
import { range, rangeEq } from "../utils";
import { Change } from "./change";
import { Segment } from "./types";
import { calculateCandidateMatchLength, getIndexesFromSegment } from "./utils";

export interface Offset {
  index: number;
  type: DiffType;
  triggeringChange?: Change;
}

// number = index
export type OffsetsMap = Map<number, Offset>;

const alignmentTable = {
  a: new Map() as OffsetsMap,
  b: new Map() as OffsetsMap,
};

export function computeMoveAlignment(changes: Change[]): Change[] {
  const unalignedChanges: Change[] = [];

  for (const change of changes) {
    const unalignedSegments: Segment[] = [];

    for (const segment of change.segments) {
      if (canSegmentBeAligned(segment)) {
        addAlignment(segment);
      } else {
        unalignedSegments.push(segment);
      }
    }

    if (unalignedSegments.length === 0) {
      // Fully aligned
      continue
    } else {
      if (unalignedSegments.length !== change.length) {
        change.segments = unalignedSegments;
        change.length = calculateCandidateMatchLength(unalignedSegments);
      }

      unalignedChanges.push(change);
    }
  }

  return unalignedChanges;
}

function addAlignment(segment: Segment) {
  const { a, b } = getIndexesFromSegment(segment);

  const offsettedA = { start: getOffsettedIndex(Side.a, a.start), end: getOffsettedIndex(Side.a, a.end) };
  const offsettedB = { start: getOffsettedIndex(Side.b, b.start), end: getOffsettedIndex(Side.b, b.end) };

  const indexDiff = Math.abs(offsettedA.start - offsettedB.start);
  
  const sideToAlignStart = offsettedA.start < offsettedB.start ? Side.a : Side.b;

  function apply(side: Side, index: number) {
    for (const i of range(index, index + indexDiff)) {
      alignmentTable[side].set(i, { index: i, type: DiffType.move });
    }
  }

  if (sideToAlignStart === Side.a) {
    apply(Side.a, offsettedA.start);
    apply(Side.b, offsettedB.end);
  } else {
    apply(Side.a, offsettedA.end);
    apply(Side.b, offsettedB.start);
  }
}

type SegmentAlignmentCheckResult =
  | { canBeAligned: false }
  | { canBeAligned: true; offsets: Offset[]; sideToAlign: Side };

function canSegmentBeAligned(segment: Segment): boolean {
  const { a, b } = getIndexesFromSegment(segment);

  const offsettedAIndex = getOffsettedIndex(Side.a, a.start);
  const offsettedBIndex = getOffsettedIndex(Side.b, b.start);

  if (offsettedAIndex === offsettedBIndex) {
    return true
  }

  const sideToIterate = offsettedAIndex < offsettedBIndex ? Side.a : Side.b;
  const offsetsToCheck = alignmentTable[sideToIterate];
  const startIndex =
    sideToIterate === Side.a ? offsettedAIndex : offsettedBIndex;
  const indexDiff = Math.abs(offsettedAIndex - offsettedBIndex);

  for (const i of rangeEq(startIndex, startIndex + indexDiff)) {
    const offset = offsetsToCheck.get(i);

    // The offset trackers contains allegement from all the change types, but when it comes to movement alignment
    //  we are only interested in the ones coming from`moves`
    if (!offset || offset.type !== DiffType.move) {
      continue;
    }

   
    return false;
  }

  return true;
}

function getOffsettedIndex(side: Side, targetIndex: number) {
  const ogIndex = targetIndex;
  const _side = alignmentTable[side];

  let offset = 0;
  // TODO: Use and array with insertion sort
  // The offset is unsorted, so we need to order the indexes first before processing it
  for (const index of [..._side.keys()].sort((a, b) => (a > b ? 1 : -1))) {
    if (index <= targetIndex) {
      // We increase the target index so that if we are inside an alignment (example bellow) we can read the offsets properly, for example:
      //
      // A          B
      // ------------
      // 1          1
      // 2          2
      // 3          1
      //            2
      //            3
      //
      // A          B
      // ------------
      // -          1
      // -          2
      // 1          1
      // 2          2
      // 3          3
      //
      // Alignments are [0, 1] in "offsetA", the "1" in A side has index 0, so if we don't do anything special only the first alignment will be included
      targetIndex++;
      offset++;
    } else {
      break;
    }
  }

  return ogIndex + offset;
}
