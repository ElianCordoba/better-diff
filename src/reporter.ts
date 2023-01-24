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

  function insertNewlines(insertAtLine: number, side: "a" | "b", type?: string): string[] {
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

  function applySimpleAlignments(alignmentTable: AlignmentTable) {
    if (alignmentTable.a.size) {
      for (const lineNumber of alignmentTable.a.keys()) {
        linesA = insertNewlines(lineNumber, "a");
      }
    }

    if (alignmentTable.b.size) {
      for (const lineNumber of alignmentTable.b.keys()) {
        linesB = insertNewlines(lineNumber, "b");
      }
    }
  }

  const { alignmentTable, alignmentsOfMoves } = getContext()

  // First we apply the "simple" alignments, aka the ones we know are compatible and require no extra verification.
  // These are additions, deletions and formats
  applySimpleAlignments(alignmentTable)

  // Then we apply the moves alignments, right now they are also simple one but in the future we want to include "full" alignment and not just partial ones
  // Before applying them we need to make sure they still apply, for example:
  //
  //   1   |   -
  //          ^^^ We want to align here, but's it's already aligned, so we can skip it
  for (const move of alignmentsOfMoves) {
    function needsPartialAlignment(side: Side, at: number) {
      return !alignmentTable[side].has(at)
    }

    const startA = move.startA + alignmentTable.getOffset('a', move.startA)
    if (needsPartialAlignment(Side.b, startA)) {
      linesB = insertNewlines(startA, Side.b, " | Start a");
      alignmentTable.add(Side.b, startA)
    }

    const endA = move.endA + alignmentTable.getOffset('a', move.endA)
    if (needsPartialAlignment(Side.b, endA)) {
      linesB = insertNewlines(endA, Side.b, " | End a");
      alignmentTable.add(Side.b, endA)
    }

    const startB = move.startB + alignmentTable.getOffset('b', move.startB)
    if (needsPartialAlignment(Side.a, startB)) {
      linesA = insertNewlines(startB, Side.a, " | Start b");
      alignmentTable.add(Side.a, startB)
    }

    const endB = move.endB + alignmentTable.getOffset('b', move.endB)
    if (needsPartialAlignment(Side.a, endB)) {
      linesA = insertNewlines(endB, Side.a, " | End b");
      alignmentTable.add(Side.a, endB)
    }
  }

  return {
    a: linesA.join("\n"),
    b: linesB.join("\n"),
  };
}