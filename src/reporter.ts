import { ChangeType, Range } from "../src/types";
import { AlignmentTable } from "./alignmentTable";
import { Change } from "./change";

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

      case ChangeType.removal: {
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
        throw new Error(`Unhandled type "${type}"`);
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

function getRanges(range: Range | undefined) {
  return {
    start: range?.start || 0,
    end: range?.end || 0,
  };
}

export function getComplimentArray(length: number, fillInCharacter = ""): string[] {
  return new Array(length).fill(fillInCharacter);
}

export function getAlignedSources2(alignmentTable: AlignmentTable, a: string, b: string, alignmentText = "\n") {
  let linesA = a.replace(/\n$/, "").split("\n");
  let linesB = b.replace(/\n$/, "").split("\n");

  function insertNewlines(insertAtLine: number, linesToInsert: number, side: "a" | "b"): string[] {
    const chars = side === "a" ? linesA : linesB;

    // The -1 is because line number start at 1 but we need 0-indexed number for the array slice
    const insertAt = (insertAtLine - 1);

    const head = chars.slice(0, insertAt);
    const tail = chars.slice(insertAt, chars.length);

    const compliment = getComplimentArray(linesToInsert, alignmentText);

    const newChars = [...head, ...compliment, ...tail];

    return newChars
  }

  for (const [lineNumber, extraLines] of Object.entries(alignmentTable.a)) {
    linesA = insertNewlines(Number(lineNumber), extraLines, 'a')
  }

  for (const [lineNumber, extraLines] of Object.entries(alignmentTable.b)) {
    linesB = insertNewlines(Number(lineNumber), extraLines, 'b')
  }

  return {
    a: linesA.join("\n"),
    b: linesB.join("\n"),
  };
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
export function getAlignedSources(a: string, b: string, changes: Change[], alignmentText = "\n") {
  let linesA = a.replace(/\n$/, "").split("\n");
  let linesB = b.replace(/\n$/, "").split("\n");

  // An offset is needed to keep track of the added new lines, we need one for each side
  let offsetA = 0;
  let offsetB = 0;

  function insertNewlines(lineStart: number, lineEnd: number, side: "a" | "b"): [string[], number] {
    const offset = side === "a" ? offsetA : offsetB;
    const chars = side === "a" ? linesA : linesB;

    // The -1 is because line number start at 1 but we need 0-indexed number for the array slice
    const insertAt = (lineStart - 1) - offset;

    const head = chars.slice(0, insertAt);
    const tail = chars.slice(insertAt, chars.length);

    // TODO: Document the meaning of the +1
    const linesDiff = Math.abs(lineStart - lineEnd) + 1;
    const compliment = getComplimentArray(linesDiff, alignmentText);

    const newChars = [...head, ...compliment, ...tail];

    return [newChars, offset + linesDiff];
  }

  // The logic works as follows:
  // If we see a removal, means that there was a line (or more) of code that was a the a side but it's not on the b side, so we need to add it there
  // The opposite happens for additions, we have some new code on the b side and we need to add lines to the a side to align them
  // When it comes to moves we first check if the lines moved match on both side, for example we moved 3 on one side and it's reflected as 3 on the other side
  // if this is the case then we don't need to do work. This is not always the case, for example you can have
  //
  // if (true)
  //
  // ---------
  //
  // if (
  //  true
  // )
  //
  // In this case the moves don't match so we calculate the difference and then insert the new lines on the side that correspond
  for (const { nodeA, nodeB, type } of changes) {
    switch (type) {
      case ChangeType.removal: {
        const [newLines, offset] = insertNewlines(nodeA?.lineNumberStart!, nodeA?.lineNumberEnd!, "b");
        linesB = newLines;
        offsetB = offset;
        break;
      }

      case ChangeType.addition: {
        const [newLines, offset] = insertNewlines(nodeB?.lineNumberStart!, nodeB?.lineNumberEnd!, "a");
        linesA = newLines;
        offsetA = offset;
        break;
      }

      case ChangeType.move: {
        const linesMovedA = Math.abs(nodeA?.lineNumberStart! - nodeA?.lineNumberEnd!) + 1;
        const linesMovedB = Math.abs(nodeB?.lineNumberStart! - nodeB?.lineNumberEnd!) + 1;

        if (linesMovedA === linesMovedB) {
          continue;
        }

        if (linesMovedA > linesMovedB) {
          const [newLines, offset] = insertNewlines(nodeA?.lineNumberStart!, nodeA?.lineNumberEnd!, "b");
          linesB = newLines;
          offsetB = offset;
        } else {
          const [newLines, offset] = insertNewlines(nodeB?.lineNumberStart!, nodeB?.lineNumberEnd!, "a");
          linesA = newLines;
          offsetA = offset;
        }

        break;
      }
      default:
        throw new Error(`Unhandled type "${type}"`);
    }
  }

  return {
    a: linesA.join("\n"),
    b: linesB.join("\n"),
  };
}
