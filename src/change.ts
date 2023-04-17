import { ChangeType, Range, Side, TypeMasks } from "./types";
import { colorFn, getSourceWithChange } from "./reporter";
import { _context } from "./index";
import { assert, fail } from "./debug";
import { getDataForChange } from "./utils";
import { Node } from "./node";

// deno-lint-ignore no-explicit-any
export class Change<Type extends ChangeType = any> {
  rangeA: Range | undefined;
  rangeB: Range | undefined;

  indexA = -1;
  indexB = -1;

  index: number;

  // This is used when processing matches, if a match contains opening nodes, it's necessary to process the closing counterpart in the same way.
  // For instance, a match resulting in an "(" being moved, the matching ")" should also be moved accordingly.
  // Similarly, if the initial match is ignored, the corresponding closing node should also be ignored.
  indexesOfClosingMoves: number[] = [];

  constructor(
    public type: Type,
    nodeOne: Node | undefined,
    nodeTwo?: Node,
    // More characters the change involved the more weight. TODO-NOW only for moves now
    public weight = 0,
  ) {
    // This node is used both for addition and deletion, it's the only one passed to the constructor. Only in moves we use the node two
    if (type & TypeMasks.AddOrDel) {
      assert(nodeOne, () => "Node one was missing during change creation");
    }

    if (type & ChangeType.move) {
      assert(nodeTwo, () => "Node two was missing during change creation");
    }

    switch (type) {
      case ChangeType.move: {
        const a = getDataForChange(nodeOne!);
        this.rangeA = a.range;
        this.indexA = a.index;

        const b = getDataForChange(nodeTwo!);
        this.rangeB = b.range;
        this.indexB = b.index;

        // There is no alignment tracking for moves just yet, it happens in the "processMoves" fn
        break;
      }

      case ChangeType.deletion: {
        const { range, index } = getDataForChange(nodeOne!);
        this.rangeA = range;
        this.indexA = index;

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
        _context.offsetTracker.add(Side.b, index);
        break;
      }

      case ChangeType.addition: {
        const { range, index } = getDataForChange(nodeOne!);
        this.rangeB = range;
        this.indexB = index;

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
        _context.offsetTracker.add(Side.a, index);
        break;
      }

      default:
        fail(`Unexpected change type ${type}`);
    }

    this.index = _context.matches.length;
    this.weight = weight || 0;
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
