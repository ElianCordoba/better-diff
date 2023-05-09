import { ChangeType, Range, Side, TypeMasks } from "./types";
import { colorFn, getSourceWithChange } from "./reporter";
import { _context } from "./index";
import { assert } from "./debug";
import { arraySum, getPrettyChangeType } from "./utils";
import { Iterator, } from "./iterator";
export class Change<Type extends ChangeType = ChangeType> {
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
    indexesTwo?: number[]
  ) {
    if (type === ChangeType.move) {
      this.indexesA = indexesOne
      this.indexesB = indexesTwo!

      assert(this.indexesA.length === this.indexesB.length)
    } else if (type === ChangeType.deletion) {
      this.indexesA = indexesOne
    } else {
      this.indexesB = indexesOne
    }

    const { iterA, iterB } = _context

    if (type & TypeMasks.DelOrMove) {
      assert(this.indexesA.length)
      this.rangeA = getRange(iterA, this.indexesA)
    }

    if (type & TypeMasks.AddOrMove) {
      assert(this.indexesB.length)
      this.rangeB = getRange(iterB, this.indexesB)
    }

    // TODO-NOW adds and dels will have the same index if no move is in between
    this.index = _context.matches.length;
  }

  // TODO-NOW Duplicated code

  _weight!: number;
  getWeight(): number {
    if (this._weight) {
      return this._weight
    }

    const side = this.getSide()
    const indexes = side === Side.a ? this.indexesA : this.indexesB
    const iter = side === Side.a ? _context.iterA : _context.iterB

    this._weight = arraySum(indexes!.map(i => iter.textNodes[i].text.length))

    return this._weight

  }

  // TODO-NOW Duplicated code

  _newLines!: number;
  getNewLines(): number {
    if (this._newLines) {
      return this._newLines
    }

    const side = this.getSide()
    const indexes = side === Side.a ? this.indexesA : this.indexesB
    const iter = side === Side.a ? _context.iterA : _context.iterB

    this._newLines = arraySum(indexes!.map(i => iter.textNodes[i].numberOfNewlines))

    return this._newLines
  }

  getFirstIndex(side?: Side) {
    return this.getIndex(this.getSide(side), 0)
  }

  getLastIndex(side?: Side) {
    return this.getIndex(this.getSide(side), -1)
  }

  private getIndex(side: Side, position: number): number {
    const indexes = side === Side.a ? this.indexesA : this.indexesB

    return indexes.at(position)!
  }

  private getSide(passedInSide?: Side): Side {
    if (passedInSide) {
      return passedInSide
    } else {
      return this.type === ChangeType.deletion ? Side.a : Side.b
    }
  }

  applyOffset() {
    const { offsetTracker } = _context
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
      this.indexesA!.map(index => {
        _context.offsetTracker.add(Side.b, { type: ChangeType.deletion, index: offsetTracker.getOffset(Side.a, index), numberOfNewLines: this.getNewLines(), change: this });
      })

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
      this.indexesB!.map(index => {
        _context.offsetTracker.add(Side.a, { type: ChangeType.addition, index: offsetTracker.getOffset(Side.b, index), numberOfNewLines: this.getNewLines(), change: this });
      })
    }
  }

  draw() {
    const { sourceA, sourceB } = _context;

    const charsA = sourceA.split("");
    const charsB = sourceB.split("");

    const changeType = getPrettyChangeType(this.type, true)

    console.log(`${changeType}`);

    if (this.rangeA) {
      console.log("----A----");

      const renderFn = this.type === ChangeType.move ? colorFn.yellow : colorFn.red

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

      const renderFn = this.type === ChangeType.move ? colorFn.yellow : colorFn.green

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

// TODO: Compact at the moment when we push new changes to the array. Mainly to save memory since we will avoid having a big array before the moment of compaction
export function compactChanges(changes: (Change & { seen?: boolean })[]) {
  const newChanges: Change[] = [];

  let currentChangeIndex = -1;
  for (const change of changes) {
    const candidate = change;

    currentChangeIndex++;

    if (change.seen) {
      continue;
    }

    if (change.type === ChangeType.move) {
      newChanges.push(change);
      continue;
    }

    // We start from the current position since we known that above changes wont be compatible
    let nextIndex = currentChangeIndex + 1;

    innerLoop:
    while (nextIndex < changes.length) {
      const next = changes[nextIndex];

      if (next.seen) {
        nextIndex++;
        continue;
      }

      if (change.type !== next.type) {
        nextIndex++;
        continue;
      }

      const readFrom = change!.type === ChangeType.deletion ? "rangeA" : "rangeB";

      const currentRange = change![readFrom]!;
      const nextRange = next[readFrom]!;

      const compatible = tryMergeRanges(currentRange, nextRange);

      if (!compatible) {
        nextIndex++;
        // No compatibility at i means that we can break early, there will be no compatibility at i + n because ranges keep moving on
        break innerLoop;
      }

      changes[nextIndex].seen = true;

      candidate[readFrom] = compatible;

      nextIndex++;
      continue;
    }

    newChanges.push(candidate);
  }

  return newChanges;
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
  const startIndex = indexes.at(0)!
  const endIndex = indexes.at(-1)!

  return {
    start: iter.textNodes[startIndex].start,
    end: iter.textNodes[endIndex].end,
  }
}