import { Side } from "./types";

export class TextAligner {
  a = new Set<number>()
  b = new Set<number>()

  add(side: Side, lineNumber: number) {
    this[side].add(lineNumber)
  }

  isEmpty() {
    return this.a.size === 0 && this.b.size === 0;
  }
}
