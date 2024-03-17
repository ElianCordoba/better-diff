import { applyAlignments } from "../backend/printer";
import { Side } from "../shared/language";
import { DiffType } from "../types";
import { rangeEq } from "../utils";
import { Change } from "./change";
import { Segment } from "./types";
import { getIndexesFromSegment } from "./utils";

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
  const resultChanges: Change[] = [];

  for (const change of changes) {
    let canMoveBeAligned = true;
    segmentLoop: for (const segment of change.segments) {
      if (!canSegmentBeAligned(segment)) {
        canMoveBeAligned = false;
        break segmentLoop;
      }
    }

    if (canMoveBeAligned) {
      const { side, offset } = getAlignment()
      addAlignment(side, offset);
    } else {
      resultChanges.push(change);
    }
  }

  return resultChanges;
}

function getAlignment(change: Change): { side: Side, offset: Offset } {
  for (const segment of change.segments) {
    const 
  }
}

function addAlignment(side: Side, offset: Offset) {
  alignmentTable[side].set(offset.index, offset)
}

function canSegmentBeAligned(segment: Segment): { canBeAligned: boolean, offsets?: Offset[] } {
  const { a, b } = getIndexesFromSegment(segment);

  const offsettedAIndex = getOffsettedIndex(Side.a, a.start);
  const offsettedBIndex = getOffsettedIndex(Side.b, b.start);

  if (offsettedAIndex === offsettedBIndex) {
    return { canBeAligned: true };
  }

  const sideToIterate = offsettedAIndex < offsettedBIndex ? Side.a : Side.b;
  const offsetsToCheck = alignmentTable[sideToIterate];
  const startIndex = sideToIterate === Side.a ? offsettedAIndex : offsettedBIndex;
  const indexDiff = Math.abs(offsettedAIndex - offsettedBIndex);

  const offsets: Offset[] = []

  let canBeAligned = true;
  for (const i of rangeEq(startIndex, startIndex + indexDiff)) {
    const offset = offsetsToCheck.get(i);

    // The offset trackers contains allegement from all the change types, but when it comes to movement alignment
    //  we are only interested in the ones coming from`moves`
    if (!offset || offset.type !== DiffType.move) {
      continue;
    }

    offsets.push({
      index: i,
      type: DiffType.move,
    })
  
    canBeAligned = false
    break;
  }

  return {
    canBeAligned,
    offsets
  }
}

function getOffsettedIndex(side: Side, targetIndex: number) {
  const ogIndex = targetIndex;
  const _side = alignmentTable[side]

  let offset = 0;
  // TODO: Use and array with insertion sort
  // The offset is unsorted, so we need to order the indexes first before processing it
  for (const index of [..._side.keys()].sort((a, b) => a > b ? 1 : -1)) {
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