import { _context } from ".";
import { Change } from "./change";
import { assert } from "./debug";
import { ChangeType, Side } from "./types";
import { range } from "./utils";

export interface Offset {
  index: number;
  type: ChangeType;
  numberOfNewLines: number;
  change?: Change;
}

// number = index
export type OffsetsMap = Map<number, Offset>;

export class OffsetTracker {
  offsetsA: OffsetsMap = new Map();
  offsetsB: OffsetsMap = new Map();

  // 1- Get offsetted index by looking at offsets above
  // 2- Update, if applicable, offsets bellow
  // 3- Sort
  add(side: Side, offset: Offset) {
    assert(typeof offset.index === "number", () => `Expected number when storing offset but received ${typeof offset.index}`);

    // const i = offset.index + this.getOffset((side), offset.index)

    // this.getSide(side).set(i, { ...offset, index: i })
    this.getSide(side).set(offset.index, offset);
  }

  getOffset(side: Side, targetIndex: number, offsets?: OffsetsMap) {
    const ogIndex = targetIndex;
    const _side = offsets ? offsets : this.getSide(side);

    let offset = 0;
    // TODO: Use and array with insertion sort
    // The offset is unsorted, so we need to order the indexes first before processing it
    for (const index of [..._side.keys()].sort((a, b) => a > b ? 1 : -1)) {
      // if (index === targetIndex) {

      // }
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

  getSide(side: Side) {
    return side === Side.a ? this.offsetsA : this.offsetsB;
  }

  moveCanGetAligned(indexA: number, indexB: number): boolean {
    // Fast-path
    if (this.isEmpty()) {
      return true;
    }

    // It's enough to check the start to determinate which side we need to iterate on. Also, since we are going to
    // go forward we pick the side with the smallest index

    const sideToIterate = indexA < indexB ? Side.a : Side.b;
    const offsetsToCheck = sideToIterate === Side.b ? this.offsetsB : this.offsetsA;

    const startIndex = sideToIterate === Side.a ? indexA : indexB;
    const indexDiff = Math.abs(indexA - indexB);

    let valid = true;
    // +1 so it includes the last index
    for (const i of range(startIndex, startIndex + indexDiff + 1)) {
      const offset = offsetsToCheck.get(i);

      // The offset trackers contains allegement from all the change types, but when it comes to movement alignment
      //  we are only interested in the ones coming from`moves`
      if (!offset || offset.type !== ChangeType.move) {
        continue;
      }

      valid = false;
      break;
    }

    return valid;
  }

  isEmpty() {
    return this.offsetsA.size === 0 && this.offsetsB.size === 0;
  }

  // TODO-NOW improve this
  print() {
    console.log("A offset tracker");
    console.table(this.offsetsA);
    console.log("\n");

    console.log("B offset tracker");
    console.table(this.offsetsB);
    console.log("\n");
  }
}
