import { Side } from "../shared/language";
import { DiffType } from "../types";
import { range, rangeEq } from "../utils";
import { Change, Move } from "./change";
import { Segment } from "./types";
import { getIndexesFromSegment, getTextLengthFromSegments } from "./utils";

export interface Offset {
  index: number;
  type: DiffType;
  triggeringChange?: Change;
}

// number = index
export type OffsetsMap = Map<number, Offset>;

interface AlignmentTable {
  a: OffsetsMap;
  b: OffsetsMap;
}

export function computeMoveAlignment(changes: Move[]): Move[] {
  const alignmentTable: AlignmentTable = {
    a: new Map(),
    b: new Map(),
  };

  const unalignedChanges: Move[] = [];

  for (const change of changes) {
    const unalignedSegments: Segment[] = [];

    for (const segment of change.segments) {
      if (canSegmentBeAligned(alignmentTable, segment)) {
        addAlignment(alignmentTable, segment);
      } else {
        unalignedSegments.push(segment);
      }
    }

    if (unalignedSegments.length === 0) {
      // Fully aligned
      continue;
    } else {
      if (unalignedSegments.length !== change.textLength) {
        change.segments = unalignedSegments;
        change.textLength = getTextLengthFromSegments(unalignedSegments);
      }

      unalignedChanges.push(change);
    }
  }

  return unalignedChanges;
}

function addAlignment(alignmentTable: AlignmentTable, segment: Segment) {
  const { a, b } = getIndexesFromSegment(segment);

  const offsettedA = { start: getOffsettedIndex(alignmentTable, Side.a, a.start), end: getOffsettedIndex(alignmentTable, Side.a, a.end) };
  const offsettedB = { start: getOffsettedIndex(alignmentTable, Side.b, b.start), end: getOffsettedIndex(alignmentTable, Side.b, b.end) };

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

function canSegmentBeAligned(alignmentTable: AlignmentTable, segment: Segment): boolean {
  const { a, b } = getIndexesFromSegment(segment);

  const offsettedAIndex = getOffsettedIndex(alignmentTable, Side.a, a.start);
  const offsettedBIndex = getOffsettedIndex(alignmentTable, Side.b, b.start);

  if (offsettedAIndex === offsettedBIndex) {
    return true;
  }

  const sideToIterate = offsettedAIndex < offsettedBIndex ? Side.a : Side.b;
  const offsetsToCheck = alignmentTable[sideToIterate];
  const startIndex = sideToIterate === Side.a ? offsettedAIndex : offsettedBIndex;
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

function getOffsettedIndex(alignmentTable: AlignmentTable, side: Side, targetIndex: number) {
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
