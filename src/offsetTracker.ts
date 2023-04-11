import { Change } from "./change";
import { Side } from "./types";
import { range } from "./utils";

export class OffsetTracker {
  // number = index
  offsetsA = new Set<number>();
  offsetsB = new Set<number>();

  add(side: Side, index: number) {
    this.getSide(side).add(index);
  }

  getOffset(side: Side, targetIndex: number) {
    const _side = this.getSide(side);

    let offset = 0;
    for (const index of _side.values()) {
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

  moveCanGetAligned(move: Change): boolean {
    // It's enough to check the start to determinate which side we need to iterate on. Also, since we are going to
    // go forward we pick the side with the smallest index

    const indexA = move.indexesA[0];
    const indexB = move.indexesB[0];

    const sideToIterate = indexA < indexB ? Side.a : Side.b;
    const offsetsToCheck = sideToIterate === Side.a ? this.offsetsA : this.offsetsB;

    const startIndex = sideToIterate === Side.a ? indexA : indexB;
    const indexDiff = Math.abs(indexA - indexB);

    let valid = true;
    for (const i of range(startIndex, startIndex + indexDiff)) {
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
