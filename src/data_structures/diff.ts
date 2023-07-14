import { ChangeType, Range, Side, TypeMasks } from "../types";
import { colorFn, getSourceWithChange } from "../reporter";
import { _context } from "../index";
import { assert } from "../debug";
import { arraySum, getIterFromSide, getPrettyChangeType } from "../utils";
import { Iterator } from "../iterator";
import { LineAlignmentTable, insertAddOrDelAlignment } from "../textAligner";

export class Diff<Type extends ChangeType = ChangeType> {
  rangeA: Range | undefined;
  rangeB: Range | undefined;

  public indexesA: number[] = [];
  public indexesB: number[] = [];
  index: number;

  // This is used when processing matches, if the move contains an odd number of opening nodes, one or move closing nodes
  // moves will be created we store their indexes here. More information in the "processMoves" fn
  indexesOfClosingMoves: number[] = [];

  constructor(
    public type: Type,
    indexesOne: number[],
    indexesTwo?: number[],
  ) {
    if (type === ChangeType.move) {
      this.indexesA = indexesOne;
      this.indexesB = indexesTwo!;

      assert(this.indexesA.length === this.indexesB.length);
    } else if (type === ChangeType.deletion) {
      this.indexesA = indexesOne;
    } else {
      this.indexesB = indexesOne;
    }

    const { iterA, iterB } = _context;

    if (type & TypeMasks.DelOrMove) {
      assert(this.indexesA.length);
      this.rangeA = getRange(iterA, this.indexesA);
    }

    if (type & TypeMasks.AddOrMove) {
      assert(this.indexesB.length);
      this.rangeB = getRange(iterB, this.indexesB);
    }

    // TODO-NOW adds and dels will have the same index if no move is in between
    this.index = _context.matches.length;
  }

  // TODO-NOW Duplicated code

  _weight!: number;
  getWeight(): number {
    // if (this._weight) {
    //   return this._weight;
    // }

    const side = this.getSide();
    const indexes = side === Side.a ? this.indexesA : this.indexesB;
    const iter = side === Side.a ? _context.iterA : _context.iterB;

    this._weight = arraySum(indexes!.map((i) => iter.nodes[i].text.length));

    return this._weight;
  }

  // TODO-NOW Duplicated code

  _newLines!: number;
  getNewLines(_side?: Side): number {
    // TODO-NOW: One cache per side
    // if (this._newLines) {
    //   return this._newLines;
    // }

    const side = this.getSide(_side);
    const indexes = side === Side.a ? this.indexesA : this.indexesB;
    const iter = side === Side.a ? _context.iterA : _context.iterB;

    this._newLines = arraySum(indexes!.map((i) => iter.nodes[i].numberOfNewlines));

    return this._newLines;
  }

  getWidth(side: Side) {
    const indexes = side === Side.a ? this.indexesA : this.indexesB;
    const iter = getIterFromSide(side)

    const lineStart = iter.nodes[indexes[0]].lineNumberStart
    const lineEnd = iter.nodes[indexes.at(-1)!].lineNumberEnd
    const newLines = this.getNewLines(side)

    return (lineEnd - lineStart) + 1 + newLines
  }

  getFirstIndex(side?: Side) {
    return this.getIndex(this.getSide(side), 0);
  }

  getLastIndex(side?: Side) {
    return this.getIndex(this.getSide(side), -1);
  }

  getOffsettedLineStart(side: Side) {
    const index = this.getFirstIndex(side)
    const iter = getIterFromSide(side)

    return iter.nodes[index].getOffsettedLineNumber('start')
  }

  getOffsettedLineEnd(side: Side) {
    const index = this.getLastIndex(side)
    const iter = getIterFromSide(side)

    return iter.nodes[index].getOffsettedLineNumber('end')
  }

  private getIndex(side: Side, position: number): number {
    const indexes = side === Side.a ? this.indexesA : this.indexesB;

    return indexes.at(position)!;
  }

  private getSide(passedInSide?: Side): Side {
    if (passedInSide) {
      return passedInSide;
    } else {
      return this.type === ChangeType.deletion ? Side.a : Side.b;
    }
  }

  getNodesPerLine(side: Side) {
    const indexes = side === Side.a ? this.indexesA : this.indexesB
    const iter = getIterFromSide(side)

    const nodesPerLine: Map<number, Set<number>> = new Map();

    for (const i of indexes) {
      const node = iter.nodes[i];

      assert(node);

      const line = node.getOffsettedLineNumber('start');

      if (nodesPerLine.has(line)) {
        nodesPerLine.get(line)!.add(node.index);
      } else {
        nodesPerLine.set(line, new Set([node.index]));
      }
    }

    return nodesPerLine
  }

  applyOffset(): LineAlignmentTable {
    const { offsetTracker } = _context;
    if (this.type === ChangeType.deletion) {
      // Alignment for deletions:
      //
      // A          B
      // ------------
      // 1          2
      // 2
      //
      // With alignment
      //
      // A          B
      // ------------
      // 1          -
      // 2          2
      this.indexesA!.map((index) => {
        _context.offsetTracker.add(Side.b, {
          type: ChangeType.deletion,
          index: offsetTracker.getOffset(Side.a, index),
          numberOfNewLines: this.getNewLines(),
          change: this,
        });
      });

      return insertAddOrDelAlignment(this)
    } else {
      // Alignment for additions:
      //
      // A          B
      // ------------
      // y          x
      //            y
      //            z
      // With alignment
      //
      // A          B
      // ------------
      // -          x
      // y          y
      // -          z
      this.indexesB!.map((index) => {
        _context.offsetTracker.add(Side.a, {
          type: ChangeType.addition,
          index: offsetTracker.getOffset(Side.b, index),
          numberOfNewLines: this.getNewLines(),
          change: this,
        });
      });

      return insertAddOrDelAlignment(this)
    }
  }

  getText(side: Side) {
    const indexes = side === Side.a ? this.indexesA : this.indexesB;
    const iter = getIterFromSide(side);

    return indexes.map((i) => iter.nodes[i].text).join(" ");
  }

  draw() {
    const { sourceA, sourceB } = _context;

    const charsA = sourceA.split("");
    const charsB = sourceB.split("");

    const changeType = getPrettyChangeType(this.type, true);

    console.log(`${changeType}`);

    if (this.rangeA) {
      console.log("----A----");

      const renderFn = this.type === ChangeType.move ? colorFn.yellow : colorFn.red;

      console.log(
        getSourceWithChange(
          charsA,
          this.rangeA.start,
          this.rangeA.end,
          renderFn,
        ).join(""),
      );
      console.log("\n");
    }

    if (this.rangeB) {
      console.log("----B----");

      const renderFn = this.type === ChangeType.move ? colorFn.yellow : colorFn.green;

      console.log(
        getSourceWithChange(
          charsB,
          this.rangeB.start,
          this.rangeB.end,
          renderFn,
        ).join(""),
      );
      console.log("\n");
    }
  }
}

// Changes are compatible to merge if their indexes are sequential, for example
// [ 1, 2 ] & [ 3, 4 ] are compatible
// [ 5 ] & [ 7 ] aren't compatible
function indexesCompatible(a: number[], b: number[]): boolean {
  const lastA = a.at(-1)!;
  const firstB = b.at(0)!;

  if (lastA + 1 === firstB) {
    return true;
  } else {
    return false;
  }
}

export function compactChanges(type: ChangeType.deletion | ChangeType.addition, _changes: (Diff & { seen?: boolean })[]) {
  if (!_changes.length) {
    return [];
  }

  assert(type & TypeMasks.AddOrDel);

  const indexesProp = type === ChangeType.deletion ? "indexesA" : "indexesB";
  const sortedChanges = _changes.sort((a, b) => {
    const indexA = a.getFirstIndex();
    const indexB = b.getFirstIndex();

    return indexA < indexB ? -1 : 1;
  });

  const finalChanges: Diff[] = [];

  for (let index = 0; index < sortedChanges.length; index++) {
    let current = sortedChanges[index];
    let next = sortedChanges[index + 1];

    if (!next) {
      finalChanges.push(current);
      break;
    }

    let currentIndexes = current[indexesProp];
    let nextIndexes = next[indexesProp];

    if (!indexesCompatible(currentIndexes, nextIndexes)) {
      finalChanges.push(current);
      continue;
    }

    // We have a compatibility, start the inner loop to see if there are more compatible nodes ahead

    let innerCursor = index + 1;

    // Values to accumulate
    const indexes = [...currentIndexes, ...nextIndexes]; // Skip first two entries since we know they are compatible
    const closingNodeIndexes: number[] = [];

    innerLoop:
    while (true) {
      const _current = sortedChanges[innerCursor];
      const _next = sortedChanges[innerCursor + 1];

      if (!_next) {
        break innerLoop;
      }

      const _indexesCurrent = _current[indexesProp];
      const _indexesNext = _next[indexesProp];

      if (!indexesCompatible(_indexesCurrent, _indexesNext)) {
        break innerLoop;
      }

      indexes.push(..._indexesNext);

      // TODO: Enable this? Find a test case first
      // closingNodeIndexes.push(..._current.indexesOfClosingMoves, ..._next.indexesOfClosingMoves)

      innerCursor++;
    }

    const newChange = new Diff(
      type,
      indexes,
    );

    // TODO-NOW replace indexesOfClosingMoves with ids
    //newChange.indexesOfClosingMoves

    finalChanges.push(
      newChange,
    );

    index = innerCursor;
  }

  return finalChanges;
}

export function tryMergeRanges(
  rangeA: Range,
  rangeB: Range,
): Range | undefined {
  if (rangeA.start === rangeB.start && rangeA.end === rangeB.end) {
    return rangeA;
  }

  let newStart: number;
  let newEnd: number;

  if (rangeA.end >= rangeB.start && rangeB.end >= rangeA.start) {
    newStart = Math.min(rangeA.start, rangeB.start);
    newEnd = Math.max(rangeA.end, rangeB.end);

    return {
      start: newStart,
      end: newEnd,
    };
  }
}

function getRange(iter: Iterator, indexes: number[]): Range {
  const startIndex = indexes.at(0)!;
  const endIndex = indexes.at(-1)!;

  return {
    start: iter.nodes[startIndex].start,
    end: iter.nodes[endIndex].end,
  };
}
