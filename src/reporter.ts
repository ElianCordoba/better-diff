import { _context, getOptions } from ".";
import { ChangeType, Side, TypeMasks } from "../src/types";
import { AlignmentTable } from "./alignmentTable";
import { Change } from "./change";
import { assert, fail } from "./debug";
import { OffsetTracker } from "./offsetTracker";
import { range } from "./utils";
import { Iterator } from './iterator'

//@ts-ignore TODO: Importing normally doesn't work with vitest
export const k = require("kleur");

type RenderFn = (text: string) => string;

export interface DiffRendererFn {
  addition: RenderFn;
  removal: RenderFn;
  change: RenderFn;
  move: RenderFn;
}

type Colors =
  | "blue"
  | "green"
  | "magenta"
  | "red"
  | "yellow"
  | "cyan"
  | "black"
  | "white"
  | "grey";

type ColorFns = Record<Colors, (text: string) => string>;

export const colorFn: ColorFns = {
  blue: k.blue,
  green: k.green,
  magenta: k.magenta,
  red: k.red,
  yellow: k.yellow,
  cyan: k.cyan,
  black: k.black,
  white: k.white,
  grey: k.grey,
} as const;

// Pretty print. Human readable
export const prettyRenderFn: DiffRendererFn = {
  addition: colorFn.green,
  removal: colorFn.red,
  change: colorFn.yellow,
  move: (text) => k.blue().underline(text),
};

// Testing friendly
export const asciiRenderFn: DiffRendererFn = {
  addition: (text) => `➕${text}➕`,
  removal: (text) => `➖${text}➖`,
  change: (text) => `✏️${text}✏️`,
  move: (text) => `🔀${text}⏹️`,
};

export function applyChangesToSources(
  sourceA: string,
  sourceB: string,
  changes: Change[],
  renderFn = asciiRenderFn,
) {
  let charsA = sourceA.split("");
  let charsB = sourceB.split("");

  // Start at 1 since it's more human friendly
  let moveCounter = 1;

  for (const { rangeA, rangeB, type } of changes) {
    switch (type) {
      case ChangeType.addition: {
        const { start, end } = rangeB!;
        charsB = getSourceWithChange(
          charsB,
          start,
          end,
          renderFn.addition,
        );
        break;
      }

      case ChangeType.deletion: {
        const { start, end } = rangeA!;
        charsA = getSourceWithChange(
          charsA,
          start,
          end,
          renderFn.removal,
        );
        break;
      }

      case ChangeType.move: {
        const resultA = rangeA!;
        charsA = getSourceWithChange(
          charsA,
          resultA.start,
          resultA.end,
          renderFn.move,
        );

        const resultB = rangeB!;
        charsB = getSourceWithChange(
          charsB,
          resultB.start,
          resultB.end,
          renderFn.move,
        );

        moveCounter++;
        break;
      }

      default:
        fail(`Unhandled type "${type}"`);
    }
  }

  return { sourceA: charsA.join(""), sourceB: charsB.join("") };
}

export function getSourceWithChange(
  chars: string[],
  start: number,
  end: number,
  colorFn: RenderFn,
) {
  const head = chars.slice(0, start);

  const text = chars.slice(start, end).join("");

  const tail = chars.slice(end, chars.length);

  // We need to add entries to the array in order to keep the positions of the nodes accurately, for example:
  //
  // chars = ['a', 'b', 'c' ]
  // After we merge 'a' with 'b', c is now at index 1, instead of 2
  //
  // To calculate the characters to add we take the difference between the end and the start and subtract one,
  // this is because we need to count for the character we added
  const charsToAdd = end - start - 1;

  const compliment = getComplimentArray(charsToAdd);

  return [...head, colorFn(text), ...compliment, ...tail];
}

export function getComplimentArray(length: number, fillInCharacter = ""): string[] {
  assert(length >= 0, () => `Length of compliment array invalid. Got ${length}`);

  return new Array(length).fill(fillInCharacter);
}

// This function returns both sources with the lines aligned, here an example with line number included:
//
// 1) x
//
// --------
//
// 1) "hello"
// 2) x
//
// The b side will be the same but the a side will be
//
// <<New line>>
// 1) x
//
// There are test covering this behavior in the file "sourceAlignment.test.ts"
export function getAlignedSources(
  a: string,
  b: string,
) {
  let linesA = a.split("\n");
  let linesB = b.split("\n");

  const { includeDebugAlignmentInfo, alignmentText } = getOptions();

  function insertNewlines(insertAtLine: number, side: Side.a | Side.b, type?: string): string[] {
    const chars = side === Side.a ? linesA : linesB;

    // The -1 is because line number start at 1 but we need 0-indexed number for the array slice
    const insertAt = insertAtLine - 1;

    const head = chars.slice(0, insertAt);
    const tail = chars.slice(insertAt, chars.length);

    const _alignmentText = includeDebugAlignmentInfo ? alignmentText + type : alignmentText;

    const compliment = getComplimentArray(1, _alignmentText);

    const newChars = [...head, ...compliment, ...tail];

    return newChars;
  }

  function applySimpleAlignments(alignmentTable: AlignmentTable) {
    if (alignmentTable.a.size) {
      for (const lineNumber of alignmentTable.a.keys()) {
        linesA = insertNewlines(lineNumber, Side.a);
      }
    }

    if (alignmentTable.b.size) {
      for (const lineNumber of alignmentTable.b.keys()) {
        linesB = insertNewlines(lineNumber, Side.b);
      }
    }
  }

  function needsPartialAlignment(side: Side, at: number) {
    return !alignmentTable[side].has(at);
  }

  const { alignmentTable, alignmentsOfMoves } = _context;

  // First we apply the "simple" alignments, aka the ones we know are compatible and require no extra verification.
  // These are additions, deletions and formats
  applySimpleAlignments(alignmentTable);

  // Then we apply the moves alignments, right now they are also simple one but in the future we want to include "full" alignment and not just partial ones
  // Before applying them we need to make sure they still apply, for example:
  //
  //   1   |   -
  //          ^^^ We want to align here, but's it's already aligned, so we can skip it
  for (const move of alignmentsOfMoves) {
    const startA = move.startA + alignmentTable.getOffset(Side.a, move.startA);
    const startB = move.startB + alignmentTable.getOffset(Side.b, move.startB);

    let endA = move.endA + alignmentTable.getOffset(Side.a, move.endA);
    let endB = move.endB + alignmentTable.getOffset(Side.b, move.endB);

    const canBeFullyAligned = endA >= startB && endB >= startA;

    if (!canBeFullyAligned) {
      continue;
    }

    if (startA !== startB) {
      // Needs alignment at the start

      const start = startA < startB ? startA : startB;
      const startLinesDiff = Math.abs(startA - startB);
      const startAlignmentSide = startA < startB ? Side.a : Side.b;

      for (const i of range(start, start + startLinesDiff)) {
        if (needsPartialAlignment(startAlignmentSide, i)) {
          if (startAlignmentSide === Side.a) {
            linesA = insertNewlines(i, Side.a, " | Start a");
          } else {
            linesB = insertNewlines(i, Side.b, " | Start b");
          }

          alignmentTable.add(startAlignmentSide, i);
        }
      }
    }

    endA = move.endA + alignmentTable.getOffset(Side.a, move.endA);
    endB = move.endB + alignmentTable.getOffset(Side.b, move.endB);

    if (endA !== endB) {
      // Needs alignment at the start

      // We add a + 1 so that the alignment is put bellow the desired line
      const end = (endA < endB ? endA : endB) + 1;
      const endLinesDiff = Math.abs(endA - endB);
      const endAlignmentSide = endA < endB ? Side.a : Side.b;

      for (const i of range(end, end + endLinesDiff)) {
        if (needsPartialAlignment(endAlignmentSide, i)) {
          if (endAlignmentSide === Side.a) {
            linesA = insertNewlines(i, Side.a, " | End a");
          } else {
            linesB = insertNewlines(i, Side.b, " | End b");
          }

          alignmentTable.add(endAlignmentSide, i);
        }
      }
    }
  }

  const compactedLines = compactAlignments(alignmentTable, linesA, linesB);

  return {
    sourceA: compactedLines.linesA.join("\n"),
    sourceB: compactedLines.linesB.join("\n"),
  };
}

function compactAlignments(alignmentTable: AlignmentTable, _linesA: string[], _linesB: string[]) {
  const linesA = [..._linesA];
  const linesB = [..._linesB];

  for (const i of alignmentTable.a.keys()) {
    if (alignmentTable.b.has(i)) {
      linesA.splice(i - 1, 1);
      linesB.splice(i - 1, 1);
    }
  }

  return {
    linesA,
    linesB,
  };
}

export function applyAlignments(sourceA: string, sourceB: string, changes: Change[], offsets: OffsetTracker): { sourceA: string, sourceB: string, changes: Change[] } {
  const { iterA, iterB } = _context
  const alignmentText = getOptions().alignmentText

  const offsettedIndexesA: number[] = []
  const offsettedIndexesB: number[] = []

  for (const node of iterA.textNodes) {
    offsettedIndexesA.push(node.index + offsets.getOffset(Side.a, node.index))
  }

  for (const node of iterB.textNodes) {
    offsettedIndexesB.push(node.index + offsets.getOffset(Side.b, node.index))
  }

  // for (const change of changes) {
  //   let indexA = change.indexA
  //   if (change.type & TypeMasks.DelOrMove) {
  //     indexA = indexA + offsets.getOffset(Side.a, indexA);
  //   }

  //   let indexB = change.indexB
  //   if (change.type & TypeMasks.AddOrMove) {
  //     indexB = indexB + offsets.getOffset(Side.b, indexB);
  //   }

  //   offsettedIndexesA.add(indexA)
  //   offsettedIndexesB.add(indexB)
  // }

  console.log()





  function findPreviousNode(asd: number[], targetIndex: number): number {
    while (true) {
      if (targetIndex === 0) {
        return 0
      }

      const found = asd.includes(targetIndex)

      if (found) {
        return targetIndex
      }

      targetIndex--
    }
  }


  function updateChanges(side: Side, index: number) {

    const changesToInclude = side === Side.a ? TypeMasks.DelOrMove : TypeMasks.AddOrMove

    for (const change of changes) {
      if (change.type & ~changesToInclude) {
        continue
      }

      if (change.index <= index) {
        continue
      }
      // usar type mask
      switch (change.type) {
        case ChangeType.deletion: {
          changes[change.index].rangeA!.start += alignmentText.length
          changes[change.index].rangeA!.end += alignmentText.length
          continue
        }
        case ChangeType.addition: {
          changes[change.index].rangeB!.start += alignmentText.length
          changes[change.index].rangeB!.end += alignmentText.length
          continue
        }
        case ChangeType.move: {
          changes[change.index].rangeA!.start += alignmentText.length
          changes[change.index].rangeA!.end += alignmentText.length
          changes[change.index].rangeB!.start += alignmentText.length
          changes[change.index].rangeB!.end += alignmentText.length
          continue
        }
      }
    }
  }

  function insertAlignments(side: Side): string {
    const _offsets = side === Side.a ? offsets.offsetsA : offsets.offsetsB
    let source = side === Side.a ? sourceA : sourceB

    if (_offsets.size === 0) {
      return source
    }

    const iter = side === Side.a ? iterA : iterB
    const offsettedIndexes = side === Side.a ? offsettedIndexesA : offsettedIndexesB

    for (const offset of _offsets.values()) {
      if (offset.numberOfNewLines === 0) {
        continue
      }

      const prevIndex = findPreviousNode(offsettedIndexes, offset.index)

      updateChanges(side, prevIndex)

      assert(typeof prevIndex === 'number' && prevIndex >= 0)

      const prevNode = iter.textNodes[prevIndex]

      const insertAt = prevNode.start

      // Falta considerar el ofset 
      source = source.slice(0, insertAt) + alignmentText + source.slice(insertAt);
    }

    return source
  }

  sourceA = insertAlignments(Side.a)
  sourceB = insertAlignments(Side.b)

  return {
    sourceA,
    sourceB,
    changes
  }
}