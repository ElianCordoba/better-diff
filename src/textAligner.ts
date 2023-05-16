import { _context, getOptions } from ".";
import { getLineMap } from "./ts-util";
import { Side } from "./types";
import { oppositeSide } from "./utils";

// line number (one-based) -> line start position
type LineMapTable = Map<number, number>;

export class TextAligner {
  lineMapA: LineMapTable = new Map()
  lineMapB: LineMapTable = new Map();

  // In which lines the \nl are inserted
  a = new Set<number>()
  b = new Set<number>()

  add(side: Side, lineNumber: number) {
    const insertAtLine = this.findInsertionPoint(side, lineNumber)

    this[side].add(insertAtLine)
  }

  updateLineMap(side: Side, source: string) {
    const fullLineMap = getLineMap(source!)

    const lineMap = this.getLineMap(side)
    lineMap.clear()

    let lineNumber = 1;
    for (const startOfLine of fullLineMap) {
      lineMap.set(lineNumber, startOfLine);
      lineNumber++;
    }

    // TODO: Update this way will be faster
    // const { alignmentText } = getOptions()
    // const lineMap = new Map(this.getLineMap(side).entries())
    // for (const [lineNumber, startPosition] of lineMap) {
    //   if (lineNumber > lineInserted) {
    //     this[side === Side.a ? 'lineMapA' : 'lineMapB'].delete(lineNumber)
    //     this[side === Side.a ? 'lineMapA' : 'lineMapB'].set(lineNumber, startPosition + alignmentText.length)
    //   }
    // }

    // this.sortLineMap(side)
  }

  getOffsettedLineNumber(side: Side, lineNumber: number) {
    const offsets = this[oppositeSide(side)];

    let offsetSum = 0
    for (const offset of offsets) {
      if (offset < lineNumber) {
        offsetSum++
      } else {
        break
      }
    }

    return lineNumber + offsetSum
  }

  getLineMap(side: Side) {
    if (side === Side.a) {
      return this.lineMapA;
    } else {
      return this.lineMapB;
    }
  }

  sortLineMap(side: Side) {
    const lineMap = this.getLineMap(side)
    const sortedValues = [...lineMap.entries()].sort((a, b) => a[0] > b[0] ? 1 : -1)
    lineMap.clear()
    for (const [key, val] of sortedValues) {
      lineMap.set(key, val)
    }
  }

  isEmpty() {
    return this.a.size === 0 && this.b.size === 0;
  }

  findInsertionPoint(side: Side, lineNumber: number) {
    let currentLine = lineNumber
    while (true) {
      if (!this[side].has(currentLine)) {
        return currentLine
      }

      currentLine++
    }
  }
}
