import { ChangeType, Range, Side, TypeMasks } from "./types";
import { colorFn, getSourceWithChange } from "./reporter";
import { _context } from "./index";
import { assert } from "./debug";

export class Change<Type extends ChangeType = any> {
  indexesA: number[] = [];
  indexesB: number[] = [];

  index: number
  indexesOfClosingMoves: number[] = []

  constructor(
    public type: Type,
    public rangeA: Range | undefined,
    public rangeB: Range | undefined,
    // List of all the indexes of nodes involved in the change

    indexesA?: number | number[],
    indexesB?: number | number[],
    // More characters the change involved the more weight. TODO-NOW only for moves now
    public weight = 0,
  ) {
    this.index = _context.matches.length
    if (typeof indexesA === "number") {
      this.indexesA = [indexesA];
    } else {
      this.indexesA = indexesA!;
    }

    if (typeof indexesB === "number") {
      this.indexesB = [indexesB];
    } else {
      this.indexesB = indexesB!;
    }

    if (type & TypeMasks.DelOrMove) {
      assert(this.rangeA, () => "Range A was missing during change creation");
    }

    if (type & TypeMasks.AddOrMove) {
      assert(this.rangeB, () => "Range B was missing during change creation");
    }

    // TODO-NOW
    // Additions and removals needs to get tracked so that we can later on process the moves, more on this in the "processMoves" function
    if (type & TypeMasks.AddOrDel) {
      // We calculate the offset from all the index up to here
      let index: number;
      //
      let sideToReadOffset: Side;

      if (type === ChangeType.deletion) {
        index = this.indexesA[0];
        sideToReadOffset = Side.b;
      } else {
        index = this.indexesB[0];
        sideToReadOffset = Side.a;
      }

      _context.offsetTracker.add(sideToReadOffset, index!);
    } else {
      // move

      this.weight = weight || 0;
    }
  }

  draw() {
    const { sourceA, sourceB } = _context;

    const charsA = sourceA.split("");
    const charsB = sourceB.split("");

    if (this.rangeA) {
      console.log("----A----");
      console.log(
        getSourceWithChange(
          charsA,
          this.rangeA.start,
          this.rangeA.end,
          colorFn.green,
        ).join(""),
      );
      console.log("\n");
    }

    if (this.rangeB) {
      console.log("----B----");
      console.log(
        getSourceWithChange(
          charsB,
          this.rangeB.start,
          this.rangeB.end,
          colorFn.green,
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
