import { _context } from ".";
import { getLineMap } from "./ts-util";
import { Side } from "./types";
import { oppositeSide } from "./utils";

// line number (one-based) -> line start position
type LineMapTable = Map<number, number>;

export class TextAligner {
  lineMapA: LineMapTable = new Map();
  lineMapB: LineMapTable = new Map();

  // line number -> number of nodes per line
  nodesPerLineA = new Map<number, number>();
  nodesPerLineB = new Map<number, number>();

  // In which lines the \nl are inserted
  a = new Set<number>();
  b = new Set<number>();

  add(side: Side, lineNumber: number, pushAlignmentDown = true) {
    const insertAtLine = this.findInsertionPoint(side, lineNumber, pushAlignmentDown);

    this[side].add(insertAtLine);

    this[side] = new Set(this.getSortedOffsets(side))
  }

  updateLineMap(side: Side, source: string) {
    const fullLineMap = getLineMap(source!);

    const lineMap = this.getLineMap(side);
    lineMap.clear();

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

    let offsetSum = 0;
    for (const offset of offsets) {
      if (offset <= lineNumber) {
        offsetSum++;
      } else {
        break;
      }
    }

    return lineNumber + offsetSum;
  }

  getLineMap(side: Side) {
    if (side === Side.a) {
      return this.lineMapA;
    } else {
      return this.lineMapB;
    }
  }

  sortLineMap(side: Side) {
    const lineMap = this.getLineMap(side);
    const sortedValues = [...lineMap.entries()].sort((a, b) => a[0] > b[0] ? 1 : -1);
    lineMap.clear();
    for (const [key, val] of sortedValues) {
      lineMap.set(key, val);
    }
  }

  getSortedOffsets(side: Side) {
    const offsets = [...this[side]]

    return offsets.sort((a, b) => a > b ? 1 : -1)
  }

  isEmpty() {
    return this.a.size === 0 && this.b.size === 0;
  }

  getLastLineStart(side: Side) {
    return [...this.getLineMap(side).values()].sort((a, b) => a < b ? -1 : 1).at(-1)!;
  }

  // `pushAlignmentDown` will do the following, given the following alignments, with line number in the left and trying to insert a new one at line 2:
  //
  // 1 |
  // 2 | -
  // 3 | -
  // 4 | 
  //
  // With `pushAlignmentDown` in `false`: We will return 2 from the function meaning that the alignment will be ignored, since it's already present
  // With `pushAlignmentDown` in `true`: We will find the next free spot, which is 4 and return that
  findInsertionPoint(side: Side, lineNumber: number, pushAlignmentDown: boolean) {
    // if (!pushAlignmentDown) {
    return lineNumber
    // }

    let currentLine = lineNumber;
    while (true) {
      if (!this[side].has(currentLine)) {
        return currentLine;
      }

      currentLine++;
    }
  }

  // Returns true if all the nodes in a given line are involved in a change, for example:
  // In line 5 you have 3 nodes, if a deletion comes in, we will read the "indexesA" prop, the length of the array
  // must be 3 in order to conclude that the whole line is deleted.
  // This also is used for additions
  wholeLineAffected(side: Side, lineNumber: number, numberOfNodesAffected: number) {
    const readFrom = side === Side.a ? "nodesPerLineA" : "nodesPerLineB";
    return this[readFrom].get(lineNumber) === numberOfNodesAffected;
  }
}
