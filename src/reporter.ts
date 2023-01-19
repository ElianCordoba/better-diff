import { LayoutShift, LayoutShiftCandidate } from ".";
import { ChangeType } from "../src/types";
import { Change } from "./change";
import { DebugFailure } from "./debug";
import { getRanges } from "./utils";

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

  function insertNewlines(insertAtLine: number, side: "a" | "b", type: ChangeType): string[] {
    const chars = side === "a" ? linesA : linesB;

    // The -1 is because line number start at 1 but we need 0-indexed number for the array slice
    const insertAt = (insertAtLine - 1);

    const head = chars.slice(0, insertAt);
    const tail = chars.slice(insertAt, chars.length);

    const compliment = getComplimentArray(1, alignmentText + type);

    const newChars = [...head, ...compliment, ...tail];

    return newChars;
  }

  function canBeFullyAligned(shift: LayoutShift): boolean {
    return false
  }

  const alignedALines = new Set<number>()
  const alignedBLines = new Set<number>()

  function applyShifts(shift: LayoutShift) {
    if (shift.a.size) {
      for (const lineNumber of shift.a.keys()) {
        if (alignedALines.has(lineNumber)) {
          continue
        } else {
          alignedALines.add(lineNumber)
          linesA = insertNewlines(lineNumber, "a", shift.producedBy);
        }

      }
    }

    if (shift.b.size) {
      for (const lineNumber of shift.b.keys()) {
        if (alignedBLines.has(lineNumber)) {
          continue
        } else {
          alignedBLines.add(lineNumber)
          linesB = insertNewlines(lineNumber, "b", shift.producedBy);
        }
      }
    }
  }



  // First align del/add/fmt??

  const addOrDelShifts = layoutShifts.filter(x => x.producedBy === ChangeType.addition || x.producedBy === ChangeType.deletion)
  // Sort descending, longest lcs first
  const moveShifts = layoutShifts.filter(x => x.producedBy === ChangeType.move).sort((a, b) => b.lcs - a.lcs)

  for (const shift of addOrDelShifts) {
    applyShifts(shift)
  }

  for (const shift of moveShifts) {
    if (canBeFullyAligned(shift)) {
      // Full align

      applyShifts(shift)
    } else {
      // Partial align
      const { nodeA, nodeB } = shift

      const startA = nodeA.lineNumberStart
      const startB = nodeB.lineNumberStart

      // const lowerSide = startA < startB ? 'a' : 'b'
      // const upperSide = lowerSide === 'a' ? 'b' : 'a'

      const newShift = new LayoutShiftCandidate()



      newShift.add('a', startB, 0)
      newShift.add('b', startA, 0)

      applyShifts(newShift.getShift(ChangeType.move, nodeA, nodeB))
    }
  }

  return {
    a: linesA.join("\n"),
    b: linesB.join("\n"),
  };
}