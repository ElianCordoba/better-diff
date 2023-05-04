import { ChangeType, Range, Side, TypeMasks } from "./types";
import { colorFn, getSourceWithChange } from "./reporter";
import { _context } from "./index";
import { assert, fail } from "./debug";
import { getDataForChange, getPrettyChangeType } from "./utils";
import { Node } from "./node";

// deno-lint-ignore no-explicit-any
export class Change<Type extends ChangeType = ChangeType> {
  rangeA: Range | undefined;
  rangeB: Range | undefined;

  indexA = -1;
  indexB = -1;

  index: number;

  // This is used when processing matches, if the move contains an odd number of opening nodes, one or move closing nodes
  // moves will be created we store their indexes here. More information in the "processMoves" fn
  indexesOfClosingMoves: number[] = [];

  constructor(
    public type: Type,
    nodeOne: Node,
    nodeTwo?: Node,
    // More characters the change involved the more weight
    public weight = 0,
    public numberOfNewLines = 0
  ) {
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

        this.numberOfNewLines = nodeOne.numberOfNewlines

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
        // _context.offsetTracker.add(Side.b, { type: ChangeType.deletion, index, numberOfNewLines: nodeOne.numberOfNewlines, change: this });
        break;
      }

      case ChangeType.addition: {
        const { range, index } = getDataForChange(nodeOne!);
        this.rangeB = range;
        this.indexB = index;

        this.numberOfNewLines = nodeOne.numberOfNewlines

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
        // _context.offsetTracker.add(Side.a, { type: ChangeType.addition, index, numberOfNewLines: nodeOne.numberOfNewlines, change: this });
        break;
      }

      default:
        fail(`Unexpected change type ${type}`);
    }

    if (type & TypeMasks.DelOrMove) {
      assert(this.rangeA, () => "Range A is not present on change creation");
    }

    if (type & TypeMasks.AddOrMove) {
      assert(this.rangeB, () => "Range B is not present on change creation");
    }

    // TODO-NOW adds and dels will have the same index if no move is in between
    this.index = _context.matches.length;
  }

  applyOffset() {
    const { offsetTracker } = _context
    if (this.type === ChangeType.deletion) {
      _context.offsetTracker.add(Side.b, { type: ChangeType.deletion, index: offsetTracker.getOffset(Side.a, this.indexA), numberOfNewLines: this.numberOfNewLines, change: this });
    } else {
      _context.offsetTracker.add(Side.a, { type: ChangeType.addition, index: offsetTracker.getOffset(Side.b, this.indexB), numberOfNewLines: this.numberOfNewLines, change: this });
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
