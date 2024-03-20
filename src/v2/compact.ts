// import { fail } from "../debug";
// import { DiffType, TypeMasks } from "../types";
// import { Change } from "./change";
// import { Segment } from "./types";
// import { getIndexesFromSegment } from "./utils";

import { assert, fail } from "../debug";
import { DiffType } from "../types";
import { Change } from "./change";
import { Segment } from "./types";
import { getIndexesFromSegment } from "./utils";

// export function compactChanges(changes: Change[]): Change[] {
//   const moves: Change[] = [];
//   const changesToCompact: Change[] = [];

//   for (const change of changes) {
//     if (change.type !== DiffType.move) {
//       moves.push(change);
//       continue;
//     }

//     changesToCompact.push(change);
//   }

//   const compactedChanges: Change[] = [];
//   for (let index = 0; index < changesToCompact.length - 1; index++) {
//     const current = changesToCompact[index];
//     const next = changesToCompact[index + 1];

//     if (!next) {
//       fail('OOOPPSPSPS')
//       compactedChanges.push(current);
//       break;
//     }

//     const currentSegments = current.segments;
//     const nextSegments = next.segments;

//     // For each segment ...

//     // ASD
//     // if (!areIndexesCompatible(currentSegments, nextSegments)) {
//     //   compactedChanges.push(current);
//     //   continue;
//     // }

//     // We have a compatibility, start the inner loop to see if there are more compatible nodes ahead

//     let innerCursor = index + 1;

//     // Values to accumulate
//     const indexes = []// A[...currentIndexes, ...nextIndexes]; // Skip first two entries since we know they are compatible

//     innerLoop: while (true) {
//       const _current = changesToCompact[innerCursor];
//       const _next = changesToCompact[innerCursor + 1];

//       if (!_next) {
//         break innerLoop;
//       }

//       const _indexesCurrent = _current[indexesProp];
//       const _indexesNext = _next[indexesProp];

//       if (!areIndexesCompatible(_indexesCurrent, _indexesNext)) {
//         break innerLoop;
//       }

//       indexes.push(..._indexesNext);

//       // TODO: Enable this? Find a test case first
//       // closingNodeIndexes.push(..._current.indexesOfClosingMoves, ..._next.indexesOfClosingMoves)

//       innerCursor++;
//     }

//     const newChange = new Diff(type, indexes);

//     // TODO-NOW replace indexesOfClosingMoves with ids
//     //newChange.indexesOfClosingMoves

//     compactedChanges.push(newChange);

//     index = innerCursor;
//   }

//   return [...compactedChanges, ...moves];
// }

// function areIndexesCompatible(segmentOne: Segment, segmentTwo: Segment) {
//   const one = getIndexesFromSegment(segmentOne);
//   const two = getIndexesFromSegment(segmentTwo);

//   return one.a.end + 1 === two.a.start && one.b.end + 1=== two.b.start;
// }

// This function takes an array of numbers and returns another array of numbers. if the number are sequential, such as 1, 2, 3 it merges them together into one segment, otherwise it pushes the unmergable number into the result array and continues with other nubers
function mergeNumbers(numbers: number[]): number[] {
  const result: number[] = [];

  for (let index = 0; index < numbers.length - 1; index++) {
    const current = numbers[index];
    const next = numbers[index + 1];

    if (current + 1 === next) {
      result.push(current);
    } else {
      result.push(current);
      result.push(next);
    }
  }

  return result;
}

export function compactAndCreateDiff(
  diffType: DiffType.addition | DiffType.deletion,
  segments: Segment[]
) {
  const finalSegments: Segment[] = [];

  // The segment format is [indexA, indexB, length]. Additions happen on B, deletions on A
  const indexToCheck = diffType === DiffType.addition ? 1 : 0;

  let i = 0;
  let segmentStart = segments[i][indexToCheck];
  let currentSegmentLength = 1;

  while (true) {
    const currentSegment = segments[i];
    const nextSegment = segments[i + 1];

    i++;

    // No more segments to check, push the last segment before breaking the loop
    if (!nextSegment) {
      finalSegments.push(currentSegment);
      break;
    }

    assert(
      currentSegment[2] === 1 && nextSegment[2] === 1,
      () => "Additions and deletions must be of length 1"
    );

    // Since additions and deletions are always of length 1 the only thing we need to check is if the indexes are consecutive
    const first = currentSegment[indexToCheck] + 1;
    const second = nextSegment[indexToCheck];

    if (first === second) {
      // Consecutive indexes found, start the compaction
      currentSegmentLength++;
    } else {
      // Compaction broke, push the current segment and start a new one

      let newSegment: Segment;
      if (diffType === DiffType.addition) {
        newSegment = [
          // Index A
          segmentStart,
          // Index B
          -1,
          // Length
          currentSegmentLength,
        ];
      } else {
        newSegment = [
          // Index A
          -1,
          // Index B
          segmentStart,
          // Length
          currentSegmentLength,
        ];
      }

      finalSegments.push(newSegment);

      // Restart values for a new compaction
      currentSegmentLength = 1;
      segmentStart = currentSegment[indexToCheck];
    }
  }

  if (diffType === DiffType.addition) {
    return Change.createAddition(finalSegments);
  } else {
    return Change.createDeletion(finalSegments);
  }
}

// export function compactAndCreateDiffOLD(
//   diffType: DiffType.addition | DiffType.deletion,
//   segments: Segment[]
// ) {
//   const resultingSegments: Segment[] = [];

//   for (let index = 0; index < segments.length - 1; index++) {
//     const currentEnd = segments[index][1];
//     const nextStart = segments[index + 1][0];

//     if (!nextStart) {
//       fail("OOOPPSPSPS");
//       // resultingSegments.push(current);
//       break;
//     }

//     if (currentEnd + 1 === nextStart) {
//       console.log("compacted", currentEnd, nextStart);
//     } else {
//       resultingSegments.push(segments[index]);
//     }
//   }

//   if (diffType === DiffType.addition) {
//     return Change.createAddition(resultingSegments);
//   } else {
//     return Change.createDeletion(resultingSegments);
//   }
// }

// function areSegmentsContactable2(segmentOne: Segment, segmentTwo: Segment) {
//   const one = getIndexesFromSegment(segmentOne);
//   const two = getIndexesFromSegment(segmentTwo);

//   return one.a.end + 1 === two.a.start && one.b.end + 1 === two.b.start;
// }

// function areSegmentsContactable(firstIndex: number, segmentTwo: Segment) {
//   const one = getIndexesFromSegment(segmentOne);
//   const two = getIndexesFromSegment(segmentTwo);

//   return one.a.end + 1 === two.a.start && one.b.end + 1 === two.b.start;
// }
