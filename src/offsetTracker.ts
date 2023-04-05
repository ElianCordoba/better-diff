import { Side } from "./types";

export class OffsetTracker {
  // number = index
  offsetsA = new Set<number>();
  offsetsB = new Set<number>();

  add(side: Side, index: number) {
    this.getSide(side).add(index);
  }

  getOffset(side: Side, targetIndex: number) {
    const _side = this.getSide(side)

    let offset = 0;
    for (const index of _side.values()) {
      if (index <= targetIndex) {
        offset++;
      } else {
        break
      }
    }
    return offset;
  }

  getSide(side: Side) {
    return side === Side.a ? this.offsetsA : this.offsetsB;
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
