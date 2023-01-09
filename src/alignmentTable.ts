import { range } from "./utils";

export class AlignmentTable {
  // TODO
  lastLineA: number = Infinity;
  lastLineB: number = Infinity;

  // We store the line numbers where we will insert lines, on each side independently.
  a: Set<number> = new Set();
  b: Set<number> = new Set();

  add(side: "a" | "b", line: number) {
    if (side === "a") {
      // // TODO: Not sure about this
      if (this.a.has(line)) {
        line = this.getLineToInsertAlignment("a", line);
      }
      this.a.add(line);
    } else {
      // TODO: Not sure about this
      if (this.b.has(line)) {
        line = this.getLineToInsertAlignment("b", line);
      }
      this.b.add(line);
    }
  }

  getOffset(side: "a" | "b", line: number) {
    const _side = side === "a" ? this.a : this.b;

    let offset = 0;
    for (const lineWithAlignment of _side) {
      if (lineWithAlignment <= line) {
        offset++;
      } else {
        break;
      }
    }
    return offset;
  }

  getLineToInsertAlignment(side: "a" | "b", start: number) {
    const _side = side === "a" ? this.a : this.b;
    const max = side === "a" ? this.lastLineA : this.lastLineB;

    let val = start;
    for (const i of range(start + 1, max)) {
      if (_side.has(i)) {
        continue;
      }

      val = i;
      break;
    }

    return val;
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
