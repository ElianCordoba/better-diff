import { _context } from ".";
import { getLineMap } from "./ts-util";
import { ChangeType, Side, TypeMasks } from "./types";
import { getSideFromChangeType, oppositeSide, range } from "./utils";
import { Change } from "./change";
import { colorFn, createTextTable } from "./reporter";
import { assert } from "./debug";
import { Iterator } from './iterator'

// line number (one-based) -> line start position
type LineMapTable = Map<number, number>;

// The value is a short string so it can be printed to the console easily
export enum LineAlignmentReason {
  AdditionAffectedWholeLine = "+",
  DeletionAffectedWholeLine = "-",
  NewLineDiff = "\/n",
  MoveAlignment = "move",
}
interface LineAlignment {
  lineNumber: number;
  // More that one reason may have inserted the alignment
  reasons: string[];
  // Change that originated the alignment
  change: Change;

  nodeText: string;
}

export class TextAligner {
  lineMapA: LineMapTable = new Map();
  lineMapB: LineMapTable = new Map();

  // line number -> number of nodes per line
  nodesPerLineA = new Map<number, number>();
  nodesPerLineB = new Map<number, number>();

  // line number as key
  a = new Map<number, LineAlignment>();
  b = new Map<number, LineAlignment>();

  add(side: Side, newAlignment: LineAlignment) {
    const { lineNumber, reasons, nodeText } = newAlignment;

    const insertAtLine = lineNumber

    const existingAlignment = this[side].get(insertAtLine);
    const formattedReason = colorFn.magenta(`${reasons} "${nodeText}"`)

    // TODO(Perf): Skip some of the info, like the "nodeText" in release mode
    if (existingAlignment) {
      // Append new reason
      existingAlignment.reasons = existingAlignment.reasons.concat(formattedReason)

      this[side].set(insertAtLine, existingAlignment);
    } else {
      newAlignment.lineNumber = insertAtLine
      newAlignment.reasons = [formattedReason]

      this[side].set(insertAtLine, newAlignment);
    }

    this[side] = new Map(this.getSortedOffsets(side));

    this.draw()

    1
  }

  getOffsettedLineNumber(side: Side, lineNumber: number) {
    const offsets = this[side];

    for (const alignment of offsets.values()) {
      if (alignment.lineNumber <= lineNumber) {
        lineNumber++
      } else {
        break;
      }
    }

    return lineNumber;
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
    const copy = new Map(this[side]);

    return new Map([...copy.entries()].sort((a, b) => a[0] > b[0] ? 1 : -1));
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
    return lineNumber;
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
    const { sourceA, sourceB } = _context;

    const linesA = sourceA.split("\n");
    const linesB = sourceB.split("\n");

    // Fill in with the alignments

    const filledLinesA = this.getFilledAlignmentList(Side.a, linesA);
    const filledLinesB = this.getFilledAlignmentList(Side.b, linesB);

    const report = createTextTable(filledLinesA, filledLinesB);

    console.log(report);
  }

  getFilledAlignmentList(side: Side, lines: string[]) {
    const alignments = this[side];

    for (const { lineNumber, reasons } of alignments.values()) {
      lines.splice(lineNumber - 1, 0, reasons.join(colorFn.yellow(' | ')).slice(0, -1));
    }

    return lines.join("\n");
  }
}

export function getUpdatedLineMap(source: string) {
  const fullLineMap = getLineMap(source);

  const lineMap: LineMapTable = new Map();

  let lineNumber = 1;
  for (const startOfLine of fullLineMap) {
    lineMap.set(lineNumber, startOfLine);
    lineNumber++;
  }

  return lineMap;

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


// Text alignment functions

// We want to insert a text alignment if the full line is deleted
//
// A          B
// ------------
// x
//
// Results in:
//
// A          B
// ------------
// x         \n
//
// But, if the whole line is _not_ deleted / added, then we don't insert it
//
// A          B
// ------------
// 1 2        2
//
// Results in the same format

export function insertAddOrDelAlignment(change: Change) {
  // This function should only be called with additions or deletions
  assert(change.type & TypeMasks.AddOrDel, () => "Tried to insert alignment in a change that wasn't a addition or deletion");

  let indexes: number[];
  let iter: Iterator;
  // It's the opposite side of where the change happened
  let sideToInsertAlignment: Side;
  // May or may not be used, declared early on for convenience
  let alignmentReason: LineAlignmentReason;

  if (change.type === ChangeType.deletion) {
    sideToInsertAlignment = Side.b;
    indexes = change.indexesA;
    iter = _context.iterA;
    alignmentReason = LineAlignmentReason.DeletionAffectedWholeLine;
  } else {
    sideToInsertAlignment = Side.a;
    indexes = change.indexesB;
    iter = _context.iterB;
    alignmentReason = LineAlignmentReason.AdditionAffectedWholeLine;
  }

  const nodesPerLine: Map<number, Set<number>> = new Map();

  for (const i of indexes) {
    const node = iter.textNodes[i];

    assert(node);

    const line = node.lineNumberStart;

    if (nodesPerLine.has(line)) {
      nodesPerLine.get(line)!.add(node.index);
    } else {
      nodesPerLine.set(line, new Set([node.index]));
    }
  }
  const { textAligner } = _context;
  const side = getSideFromChangeType(change.type);
  for (const [lineNumber, nodes] of nodesPerLine) {
    if (textAligner.wholeLineAffected(side, lineNumber, nodes.size)) {
      const offsettedLineNumber = textAligner.getOffsettedLineNumber(side, lineNumber)
      textAligner.add(sideToInsertAlignment, { lineNumber: offsettedLineNumber, change, reasons: [alignmentReason], nodeText: change.getText(side).trim() });
    }
  }
}

export function insertNewLineAlignment(match: Change, alignedChange: boolean) {
  const { indexesA, indexesB } = match;
  const { iterA, iterB, textAligner } = _context;

  for (let i = 0; i < indexesA.length; i++) {
    const indexA = indexesA[i];
    const indexB = indexesB[i];

    const nodeA = iterA.textNodes.at(indexA)!;
    const nodeB = iterB.textNodes.at(indexB)!;

    const offsettedLineA = nodeA.getOffsettedLineNumber()
    const offsettedLineB = nodeB.getOffsettedLineNumber()

    // No need to insert formatting alignments if they are already aligned
    if (offsettedLineA === offsettedLineB) {
      continue;
    }

    if (nodeA.numberOfNewlines !== nodeB.numberOfNewlines) {

      const sideToInsertAlignment = nodeA.numberOfNewlines < nodeB.numberOfNewlines ? Side.a : Side.b;
      const insertAlignmentAt = sideToInsertAlignment === Side.a
        ? nodeB.getOffsettedLineNumber()
        : nodeA.getOffsettedLineNumber()

      if (alignedChange) {
        const linesToInsert = Math.abs(nodeA.numberOfNewlines - nodeB.numberOfNewlines);
        for (const i of range(insertAlignmentAt - linesToInsert, insertAlignmentAt)) {
          textAligner.add(sideToInsertAlignment, { lineNumber: i, change: match, reasons: [LineAlignmentReason.NewLineDiff], nodeText: nodeA.text.trim() });
        }
      } else {
        const linesToInsert = sideToInsertAlignment === Side.a
          ? nodeB.numberOfNewlines - match.getWidth()
          : nodeA.numberOfNewlines - match.getWidth()
        for (const i of range(insertAlignmentAt - linesToInsert, insertAlignmentAt + match.getWidth())) {
          textAligner.add(sideToInsertAlignment, { lineNumber: i, change: match, reasons: [LineAlignmentReason.NewLineDiff], nodeText: nodeA.text.trim() });
        }
      }

    }
  }
}

// We need to add alignments to both sides, for example
//
// A          B
// ------------
// 1          2
// 2          3
// 3          1
//
// LCS is "2 3", so it results in:
//
// A          B
// ------------
// 1          -
// 2          2
// 3          3
// -          1
export function insertMoveAlignment(change: Change, indexA: number, indexB: number, offsettedIndexA: number, offsettedIndexB: number) {
  const { iterA, iterB, offsetTracker, textAligner } = _context;
  const indexDiff = Math.abs(offsettedIndexA - offsettedIndexB);

  const lineA = iterA.getLineNumber(indexA)
  const lineB = iterB.getLineNumber(indexB)

  let lineStartA = textAligner.getOffsettedLineNumber(Side.a, lineA);
  let lineStartB = textAligner.getOffsettedLineNumber(Side.b, lineB);

  const linesDiff = Math.abs(lineStartA - lineStartB);

  function apply(side: Side, index: number, lineNumberStart: number) {
    // Apply semantic offset
    for (const i of range(index, index + indexDiff)) {
      offsetTracker.add(side, { type: ChangeType.move, index: i, numberOfNewLines: 0 });
    }

    // Apply text offset
    for (const i of range(lineNumberStart, lineNumberStart + linesDiff)) {
      _context.textAligner.add(side, { lineNumber: i, change, reasons: [LineAlignmentReason.MoveAlignment], nodeText: change.getText(side).trim() });
      lineNumberStart++;
    }
  }

  // Add one extra to the alignment of side we align at the end, so it looks like this
  //
  // A          B
  // ------------
  // aa         b
  // b          aa
  //
  // Into this:
  //
  // A          B
  // ------------
  // -          b    <- Align at the start on A, inserting _before_
  // aa         aa
  // b          -    <- Align at the end on B, inserting _after_
  //
  if (offsettedIndexA > offsettedIndexB) {
    lineStartA++;
  } else {
    lineStartB++;
  }

  apply(Side.a, offsettedIndexA, lineStartA);
  apply(Side.b, offsettedIndexB, lineStartB);
}

// Remove alignments in the same line, for example
// A          B
// ------------
// x          y
// z          2
// 2
//
// Fully aligned would be:
// A          B
// ------------
// -          -
// x          y
// z          _
// 2          2
//
// After the compaction:
// A          B
// ------------
// x          y
// z          _
// 2          2
export function compactAlignments() {
  const { a, b } = _context.textAligner;

  if (!a.size && !b.size) {
    return;
  }

  for (const [alignmentAt] of a) {
    if (b.has(alignmentAt)) {
      a.delete(alignmentAt);
      b.delete(alignmentAt);
    }
  }
}
