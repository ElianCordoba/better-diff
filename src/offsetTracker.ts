import { _context } from ".";
import { Change } from "./change";
import { assert } from "./debug";
import { Side } from "./types";
import { range } from "./utils";

export class OffsetTracker {
  // number = index
  offsetsA = new Set<number>();
  offsetsB = new Set<number>();

  add(side: Side, index: number) {
    assert(typeof index === 'number', () => `Expected number when storing offset but received ${typeof index}`)
    this.getSide(side).add(index);
  }

  getOffset(side: Side, targetIndex: number) {
    const _side = this.getSide(side);

    let offset = 0;

    // The offset is unsorted, so we need to order the indexes first before processing it
    for (const index of [..._side.values()].sort((a, b) => a > b ? 1 : -1)) {
      if (index <= targetIndex) {
        offset++;
      } else {
        break;
      }
    }
    return offset;
  }

  getSide(side: Side) {
    return side === Side.a ? this.offsetsA : this.offsetsB;
  }

  moveCanGetAligned(indexA: number, indexB: number): boolean {
    // Fast-path
    if (this.offsetsA.size === 0 && this.offsetsB.size === 0) {
      return true
    }

    // It's enough to check the start to determinate which side we need to iterate on. Also, since we are going to
    // go forward we pick the side with the smallest index

    const sideToIterate = indexA < indexB ? Side.a : Side.b;
    const offsetsToCheck = sideToIterate === Side.a ? this.offsetsB : this.offsetsA;

    const startIndex = sideToIterate === Side.a ? indexA : indexB;
    const indexDiff = Math.abs(indexA - indexB);

    let valid = true;
    // +1 so it includes the last index
    for (const i of range(startIndex, startIndex + indexDiff + 1)) {
      if (offsetsToCheck.has(i)) {
        valid = false;
        break;
      }
    }

    return valid;
  }

  isEmpty() {
    return this.offsetsA.size === 0 && this.offsetsB.size === 0;
  }

  print() {
    console.log("A offset tracker");
    console.table(this.offsetsA);
    console.log("\n");

    console.log("B offset tracker");
    console.table(this.offsetsB);
    console.log("\n");
  }
}
