import { ChangeType, Range } from "../src/types";
import { Change } from "./change";

//@ts-ignore TODO: Importing normally doesnt work with vitest
export const k = require("kleur");

type DrawingFn = (text: string) => string;

interface DifferDrawingFns {
  addition: DrawingFn;
  removal: DrawingFn;
  change: DrawingFn;
  // TODO: Type
  // deno-lint-ignore no-explicit-any
  move: any;
}

interface ColorFns {
  [key: string]: (text: string) => string;
}

export const colorFn: ColorFns = {
  blue: (x) => k.underline(k.blue(x)),
  green: (x) => k.underline(k.green(x)),
  magenta: (x) => k.underline(k.magenta(x)),
  red: (x) => k.underline(k.red(x)),
  yellow: (x) => k.underline(k.yellow(x)),
  cyan: (x) => k.underline(k.cyan(x)),
  black: (x) => k.underline(k.black(x)),
  white: (x) => k.underline(k.white(x)),
  grey: (x) => k.underline(k.grey(x)),
} as const;

// Pretty print. Human readable
export const defaultDrawingFunctions: DifferDrawingFns = {
  addition: colorFn.green,
  removal: colorFn.red,
  change: colorFn.yellow,
  move: colorFn.blue,
};

// Testing friendly
export const simplifiedDrawingFunctions: DifferDrawingFns = {
  addition: (text) => `➕${text}➕`,
  removal: (text) => `➖${text}➖`,
  change: (text) => `✏️${text}✏️`,
  /**
   * @param startSection On the source side the decoration is `5️⃣let name➡️` and on the revision it's `⬅️let name5️⃣`
   * @param index Used to match moves
   */
  move: (index: number) => {
    return (text: string) => `${index}🔀${text}⏹️`;
  },
};

export function applyChangesToSources(
  sourceA: string,
  sourceB: string,
  changes: Change[],
  drawFunctions?: DifferDrawingFns,
) {
  const drawingFunctions: DifferDrawingFns = {
    ...defaultDrawingFunctions,
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
  colorFn: DrawingFn,
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
  let charsToAdd = end - start - 1;

  // TODO: Check if we can remove this
  // It could be -1 in scenarios where nodes start and end in the same location
  if (charsToAdd == -1) {
    charsToAdd = 0;
  }

  const compliment = getComplimentArray(charsToAdd);

  return [...head, colorFn(text), ...compliment, ...tail];
}

function getRanges(range: Range | undefined) {
  return {
    start: range?.start || 0,
    end: range?.end || 0,
  };
}

function getComplimentArray(length: number): string[] {
  return new Array(length).fill("");
}
