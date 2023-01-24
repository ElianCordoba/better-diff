export class AlignmentTable {
  // On each side independently we store the line number and the length of the text in that line
  a = new Map<number, number>();
  b = new Map<number, number>();

  // lastLineA = Infinity
  // lastLineB = Infinity

  add(side: "a" | "b", line: number, textLength = 1) {
    let currentValue = 0;
    if (this[side].has(line)) {
      currentValue = this[side].get(line)!;
    }

    this[side].set(line, textLength + currentValue!);
  }

  // forceAdd(side: "a" | "b", line: number, textLength = 1) {
  //   const nextFreeIndex = this.getNextFreeLine(side, line)
  //   this.add(side, nextFreeIndex, textLength)
  // }

  // getNextFreeLine(side: "a" | "b", start: number) {
  //   const _side = side === "a" ? this.a : this.b;
  //   const max = side === "a" ? this.lastLineA : this.lastLineB;

  //   let val = start;
  //   for (const i of range(start + 1, max)) {
  //     if (_side.has(i)) {
  //       continue;
  //     }

  //     val = i;
  //     break;
  //   }

  //   return val;
  // }

  getOffset(side: "a" | "b", line: number) {
    const _side = side === "a" ? this.a : this.b;

    let offset = 0;
    for (const lineWithAlignment of _side.keys()) {
      if (lineWithAlignment <= line) {
        offset++;
      } else {
        break;
      }
    }
    return offset;
  }

  isEmpty() {
    return this.a.size === 0 && this.b.size === 0;
  }

  print() {
    console.log("A alignment table");
    console.table(this.a);
    console.log("\n");

    console.log("B alignment table");
    console.table(this.b);
    console.log("\n");
  }
}
