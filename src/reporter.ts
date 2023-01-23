import { LayoutShift, getContext, getOptions } from ".";
import { ChangeType, Side } from "../src/types";
import { AlignmentTable } from "./alignmentTable";
import { Change } from "./change";
import { DebugFailure } from "./debug";
import { getRanges, range } from "./utils";

//@ts-ignore TODO: Importing normally doesnt work with vitest
export const k = require("kleur");

type RenderFn = (text: string) => string;

export interface DiffRendererFn {
  addition: RenderFn;
  removal: RenderFn;
  change: RenderFn;
  move: (matchNumber: number) => RenderFn;
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
  move: (_) => (text) => k.blue().underline(text),
};

// Testing friendly
export const asciiRenderFn: DiffRendererFn = {
  addition: (text) => `➕${text}➕`,
  removal: (text) => `➖${text}➖`,
  change: (text) => `✏️${text}✏️`,
  move: (matchNumber) => (text) => `${matchNumber}🔀${text}⏹️`,
};

export function applyChangesToSources(
  sourceA: string,
  sourceB: string,
  changes: Change[],
  drawFunctions?: DiffRendererFn,
) {
  const drawingFunctions: DiffRendererFn = {
    ...prettyRenderFn,
    ...drawFunctions,
  };

  let charsA = sourceA.split("");
  let charsB = sourceB.split("");

  // Start at 1 since it's more human friendly
  let moveCounter = 1;

  for (const { rangeA, rangeB, type } of changes) {
    switch (type) {
      case ChangeType.addition: {
        const { start, end } = getRanges(rangeB);
        charsB = getSourceWithChange(
          charsB,
          start,
          end,
          drawingFunctions.addition,
        );
        break;
      }

      case ChangeType.deletion: {
        const { start, end } = getRanges(rangeA);
        charsA = getSourceWithChange(
          charsA,
          start,
          end,
          drawingFunctions.removal,
        );
        break;
      }

      case ChangeType.move: {
        const drawFn = drawingFunctions.move(moveCounter);

        const resultA = getRanges(rangeA);
        charsA = getSourceWithChange(
          charsA,
          resultA.start,
          resultA.end,
          drawFn,
        );

        const resultB = getRanges(rangeB);
        charsB = getSourceWithChange(
          charsB,
          resultB.start,
          resultB.end,
          drawFn,
        );

        moveCounter++;
        break;
      }

      default:
        throw new DebugFailure(`Unhandled type "${type}"`);
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
  layoutShifts: LayoutShift[],
  a: string,
  b: string,
  alignmentText = "\n",
) {
  let linesA = a.split("\n");
  let linesB = b.split("\n");

  const { includeDebugAlignmentInfo } = getOptions()

  function insertNewlines(insertAtLine: number, side: "a" | "b", type: string): string[] {
    const chars = side === "a" ? linesA : linesB;

    // The -1 is because line number start at 1 but we need 0-indexed number for the array slice
    const insertAt = (insertAtLine - 1);

    const head = chars.slice(0, insertAt);
    const tail = chars.slice(insertAt, chars.length);

    const _alignmentText = includeDebugAlignmentInfo ? alignmentText + type : alignmentText

    const compliment = getComplimentArray(1, _alignmentText);

    const newChars = [...head, ...compliment, ...tail];

    return newChars;
  }

  function canBeFullyAligned(from: number, to: number): boolean {
    let isValid = true;

    loop: for (const i of range(from, to + 1)) {
      const occurrenceInA = alignmentTable.a.has(i)
      const occurrenceInB = alignmentTable.b.has(i)

      if (occurrenceInA || occurrenceInB) {
        isValid = false;
        break loop;
      }
    }

    return isValid
  }

  function applyShifts(alignmentTable: AlignmentTable, type: ChangeType) {
    if (alignmentTable.a.size) {
      for (const lineNumber of alignmentTable.a.keys()) {
        linesA = insertNewlines(lineNumber, "a", type);
      }
    }

    if (alignmentTable.b.size) {
      for (const lineNumber of alignmentTable.b.keys()) {
        linesB = insertNewlines(lineNumber, "b", type);
      }
    }
  }

  const { alignmentTable, alignmentsOfMoves } = getContext()

  // Del and adds
  applyShifts(alignmentTable, ChangeType.deletion)

  // TODO: Add draw method to visualize the steps of the alignment

  // Sort descending, longest lcs first
  const sortedMoves = alignmentsOfMoves.sort((a, b) => b.textLength - a.textLength)

  // move aligns
  moves: for (const move of sortedMoves) {
    let startA = move.startA + alignmentTable.getOffset('a', move.startA)
    let startB = move.startB + alignmentTable.getOffset('b', move.startB)

    let linesDiffStart = Math.abs(startA - startB)

    let alignmentStartsAt: number | undefined = undefined;
    let sideToAlignStart: Side | undefined = undefined;

    if (startA === startB) {
      // No alignment happens at the start
    } else if (startA < startB) {
      sideToAlignStart = Side.a
      alignmentStartsAt = startA
    } else {
      sideToAlignStart = Side.b
      alignmentStartsAt = startB
    }

    // PONER DEBAJO DEL FOR LOOP PARA QUE RECIBA EL OFFSET ACTUALIZADO

    let endA = move.endA + alignmentTable.getOffset('a', move.endA)
    let endB = move.endB + alignmentTable.getOffset('b', move.endB)

    let linesDiffEnd = Math.abs(endA - endB)

    let sideToAlignEnd: Side | undefined;
    let alignmentEndsAt: number | undefined;

    if (!sideToAlignStart) {
      // If we didn't align at the start, then the end alignment side is pick base on with is the lower side
      if (endA === endB) {
        // TODO
      } else if (endA < endB) {
        sideToAlignEnd = Side.a;
        alignmentEndsAt = endA + 1
      } else {
        sideToAlignEnd = Side.b;
        alignmentEndsAt = endB + 1
      }
    } else if (sideToAlignStart === Side.a) {
      sideToAlignEnd = Side.b;
      alignmentEndsAt = endB + 1
    } else {
      sideToAlignEnd = Side.a;
      alignmentEndsAt = endA + 1
    }

    if (canBeFullyAligned(alignmentStartsAt!, alignmentEndsAt!)) {
      if (sideToAlignStart) {
        // Align start
        for (const i of range(alignmentStartsAt!, alignmentStartsAt! + linesDiffStart)) {
          const result = insertNewlines(i, sideToAlignStart!, ChangeType.move + ' start');

          if (sideToAlignStart === Side.a) {
            linesA = result
          } else {
            linesB = result
          }


          alignmentTable.add(sideToAlignStart!, i, 1)
        }
      }

      if (sideToAlignEnd) {
        // Align end
        for (const i of range(alignmentEndsAt!, alignmentEndsAt! + linesDiffEnd)) {
          const result = insertNewlines(i, sideToAlignEnd, ChangeType.move + ' end');

          if (sideToAlignEnd === Side.a) {
            linesA = result
          } else {
            linesB = result
          }

          alignmentTable.add(sideToAlignEnd, i, 1)
        }
      }

      // Full alignment
    } else {
      function needsPartialAlignment(side: Side, at: number) {
        return !alignmentTable[side].has(at)
      }

      // Check if we need partial alignment

      const needsAlignOnAStart = needsPartialAlignment(Side.b, startA)
      const needsAlignOnAEnd = needsPartialAlignment(Side.b, endA)

      const needsAlignOnBStart = needsPartialAlignment(Side.a, startB)
      const needsAlignOnBEnd = needsPartialAlignment(Side.a, endB)

      if (needsAlignOnAStart || needsAlignOnAEnd || needsAlignOnBStart || needsAlignOnBEnd) {
        console.log('needs partial alignment')
        continue
      } else {
        console.log('Partial alignment skipped')
      }
    }
  }

  return {
    a: linesA.join("\n"),
    b: linesB.join("\n"),
  };
}