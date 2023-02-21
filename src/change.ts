import { ChangeType, Range } from "./types";
import { colorFn, getSourceWithChange } from "./reporter";
import { Node } from "./node";
import { getContext } from "./index";

export class Change {
  rangeA: Range;
  rangeB: Range;

  constructor(
    public type: ChangeType,
    public nodeA: Node | undefined,
    public nodeB: Node | undefined,
    // Changes on source
    rangeA?: Range,
    // Changes on revision
    rangeB?: Range,
  ) {
    this.rangeA = rangeA ?? nodeA?.getPosition()!;
    this.rangeB = rangeB ?? nodeB?.getPosition()!;
  }

  draw() {
    const { sourceA, sourceB } = getContext();

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