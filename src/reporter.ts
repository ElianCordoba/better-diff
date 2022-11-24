import { Change, ChangeType, Range } from "../src/types";

//@ts-ignore TODO: Importing normally doesnt work with vitest
const k = require("kleur");

type DrawingFn = (text: string) => string

interface DifferDrawingFns {
  addition: DrawingFn;
  removal: DrawingFn;
  change: DrawingFn;
  // TODO: Type
  move: any;
}

// Pretty print. Human readable
export const defaultDrawingFunctions: DifferDrawingFns = {
  addition: (text) => k.underline(k.green(text)),
  removal: (text) => k.underline(k.red(text)),
  change: (text) => k.underline(k.yellow(text)),
  move: (text: string) => k.underline(k.blue(text)),
};

const NumberToEmoji: Record<number, string> = {
  0: '0️⃣',
  1: '1️⃣',
  2: '2️⃣',
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
}

// Testing friendly
export const simplifiedDrawingFunctions: DifferDrawingFns = {
  addition: (text) => `➕${text}➕`,
  removal: (text) => `➖${text}➖`,
  change: (text) => `✏️${text}✏️`,
  /**
   * 
   * @param startSection On the source side the decoration is `5️⃣let name➡️` and on the revision it's `⬅️let name5️⃣` 
   * @param index Used to match moves
   */
  move: (startSection: boolean, index: number) => {
    return (text: string) => {
      // TODO
      if (index > 10 || index < 0) {
        throw new Error('Not implemented')
      }

      const number = NumberToEmoji[index];
      if (startSection) {
        return `${number} ${text}→`
      } else {
        return `←${text}${number} `
      }
    }
  }
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

  function applyStyle(
    chars: string[],
    start: number,
    end: number,
    colorFn: DrawingFn,
  ) {
    const head = chars.slice(0, start);

    const text = chars.slice(start, end).join("");

    const tail = chars.slice(end, chars.length);

    return [...head, colorFn(text), ...tail];
  }

  // Used to track the characters removed so that we can print property, for example
  // chars = ['a', 'b', 'c' ]
  // After we merge 'a' with 'b', c is now at index 1, instead of 2

  let aOffset = 0;
  let bOffset = 0;

  let moveCounter = 0

  for (const { rangeA, rangeB, type } of changes) {
    switch (type) {
      case ChangeType.addition: {
        const { start, end } = getRanges(rangeB, bOffset);
        charsB = applyStyle(charsB, start, end, drawingFunctions.addition);

        // The reason of the - 1 is as follows:
        // If you have a range 3 to 6, means that the characters at index 3, 4 and 5 will be compacted into one
        // So, 6 - 3 is 3 minus 1 which is the length of the new character
        bOffset += (end - start) - 1;
        break;
      }

      case ChangeType.removal: {
        const { start, end } = getRanges(rangeA, aOffset);
        charsA = applyStyle(charsA, start, end, drawingFunctions.removal);

        // The - 1 part is explained above
        aOffset += (end - start) - 1;
        break;
      }

      case ChangeType.move: {
        const fnA = drawingFunctions.move(true, moveCounter)
        const resultA = getRanges(rangeA, aOffset);
        charsA = applyStyle(charsA, resultA.start, resultA.end, fnA);
        aOffset += (resultA.end - resultA.start) - 1;

        const fnB = drawingFunctions.move(false, moveCounter)
        const resultB = getRanges(rangeB, bOffset);
        charsB = applyStyle(charsB, resultB.start, resultB.end, fnB);
        bOffset += (resultB.end - resultB.start) - 1;

        moveCounter++
        break
      }

      default:
        throw new Error(`Unhandled type "${type}"`);
    }
  }

  return { sourceA: charsA.join(""), sourceB: charsB.join("") };
}

function getRanges(range: Range | undefined, offset: number) {
  return {
    start: range?.start ? range.start - offset : 0,
    end: range?.end ? range?.end - offset : 0,
  };
}
