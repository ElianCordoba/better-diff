import { assert } from "../debug";
import { DiffType } from "../types";
import { Change } from "./change";
import { Segment } from "./types";

export function compactAndCreateDiff(
  diffType: DiffType.addition | DiffType.deletion,
  segments: Segment[],
) {
  const finalSegments: Segment[] = [];

  // The segment format is [indexA, indexB, length]. Additions happen on B, deletions on A
  const indexToCheck = diffType === DiffType.addition ? 1 : 0;

  let i = 0;
  let currentSegment = segments[i];
  let currentStart = currentSegment[indexToCheck];

  assert(currentSegment[2] === 1, () => "At this point additions and deletions must be of length 1");

  while (true) {
    const nextSegment = segments[i + 1];

    i++;

    // No more segments to check, push the last segment before breaking the loop
    if (!nextSegment) {
      finalSegments.push(currentSegment);
      break;
    }

    assert(nextSegment[2] === 1, () => "Additions and deletions must be of length 1");
    // Since additions and deletions are always of length 1 the only thing we need to check is if the indexes are consecutive

    const next = nextSegment[indexToCheck];

    if (currentStart + 1 === next) {
      // Valid compaction case, increase the length of the segment
      currentSegment[2]++;
      currentStart = next;
    } else {
      // Compaction broke, push current segment and reset values for the next one
      finalSegments.push(currentSegment);
      currentSegment = nextSegment;
    }
  }

  if (diffType === DiffType.addition) {
    return Change.createAddition(finalSegments);
  } else {
    return Change.createDeletion(finalSegments);
  }
}
