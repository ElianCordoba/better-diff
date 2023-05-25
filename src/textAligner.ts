import { _context } from ".";
import { getLineMap } from "./ts-util";
import { Side } from "./types";
import { oppositeSide } from "./utils";
import { Change } from './change'
import { colorFn } from "./reporter";

// line number (one-based) -> line start position
type LineMapTable = Map<number, number>;

// The value is a short string so it can be printed to the console easily
export enum LineAlignmentReason {
  AdditionAffectedWholeLine = '+',
  DeletionAffectedWholeLine = '-',
  NewLineDiff = '\/n',
  MoveAlignment = 'move'
}
interface LineAlignment {
  lineNumber: number;
  // More that one reason may have inserted the alignment
  reasons: LineAlignmentReason[]
  // Change that originated the alignment
  change: Change

  nodeText: string
}

// When we create a new alignment we always pass in one reason, then multiple may be stored
type NewLineAlignment = Omit<LineAlignment, 'reasons' | 'nodeText'> & { reasons: LineAlignmentReason }

export class TextAligner {
  lineMapA: LineMapTable = new Map();
  lineMapB: LineMapTable = new Map();

  // line number -> number of nodes per line
  nodesPerLineA = new Map<number, number>();
  nodesPerLineB = new Map<number, number>();

  // line number as key
  a = new Map<number, LineAlignment>();
  b = new Map<number, LineAlignment>();

  add(side: Side, newAlignment: NewLineAlignment) { // pushAlignmentDown = true
    const { lineNumber, ...remainingInfo } = newAlignment
    const insertAtLine = this.findInsertionPoint(side, lineNumber, true);

    const existingAlignment = this[side].get(insertAtLine)

    // TODO(Perf): Skip some of the info, like the "nodeText" in release mode
    if (existingAlignment) {
      const { reasons, ...existingAlignmentInfo } = existingAlignment
      this[side].set(insertAtLine, { reasons: reasons.concat(newAlignment.reasons), ...existingAlignmentInfo })
    } else {
      const { reasons, ...newAlignmentInfo } = newAlignment

      this[side].set(insertAtLine, {
        ...newAlignmentInfo,
        reasons: [reasons],
        nodeText: newAlignmentInfo.change.getText(side)
      });
    }

    this[side] = new Map(this.getSortedOffsets(side))
  }

  getOffsettedLineNumber(side: Side, lineNumber: number) {
    const offsets = this[oppositeSide(side)];

    let offsetSum = 0;
    for (const alignment of offsets.values()) {
      if (alignment.lineNumber <= lineNumber) {
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
    const copy = new Map(this[side])

    return new Map([...copy.entries()].sort((a, b) => a[0] > b[0] ? 1 : -1))
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

  draw() {
    const { sourceA, sourceB } = _context

    const linesA = sourceA.split('\n')
    const linesB = sourceB.split('\n')

    // Fill in with the alignments

    const filledLinesA = this.getFilledAlignmentList(Side.a, linesA)
    const filledLinesB = this.getFilledAlignmentList(Side.b, linesB)

    const max = Math.max(filledLinesA.length, filledLinesB.length)

    let report = '';
    for (let i = 0; i < max; i++) {
      const lineA = filledLinesA[i] || '';
      const lineB = filledLinesB[i] || '';

      const formattedLineA = colorFn.red(lineA.padStart(20))
      const formattedLineB = colorFn.green(lineB.padEnd(20))

      // + 1 because line number are 1-indexes
      const lineNumber = colorFn.yellow(String(i + 1).padEnd(2))

      report += `${lineNumber} | ${formattedLineA} | ${formattedLineB}\n`
    }

    console.log(report)
  }

  getFilledAlignmentList(side: Side, lines: string[]) {
    const alignments = this[side];

    for (const { lineNumber, reasons } of alignments.values()) {
      lines.splice(lineNumber - 1, 1, compressReasonsString(reasons));
    }

    return lines;
  }
}

function compressReasonsString(reasons: LineAlignmentReason[]) {
  const counter: Map<LineAlignmentReason, number> = new Map()

  for (const reason of reasons) {
    if (counter.has(reason)) {
      const currentValue = counter.get(reason)!
      counter.set(reason, currentValue + 1)
    } else {
      counter.set(reason, 1)
    }
  }

  let report = ''
  for (const [reason, numberOfOccurrences] of counter) {
    report += `(${reason} x${numberOfOccurrences}) |`
  }

  // Removes the last |
  return report.slice(0, -1)
}


export function getUpdatedLineMap(source: string) {
  const fullLineMap = getLineMap(source);

  const lineMap: LineMapTable = new Map()

  let lineNumber = 1;
  for (const startOfLine of fullLineMap) {
    lineMap.set(lineNumber, startOfLine);
    lineNumber++;
  }

  return lineMap

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