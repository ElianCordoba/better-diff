import { Change, ChangeType, Range } from "../src/types"

//@ts-ignore
// TODO: Importing normally doesnt work with vitest
const k = require('kleur');

function readSequence(chars: string[], from: number, to: number) {
  return chars.slice(from, to).join('')
}

type DrawingFn = (string: string) => string

interface DifferDrawingFns {
  addition: DrawingFn;
  removal: DrawingFn;
  change: DrawingFn;
  move: DrawingFn;
}

// Pretty print. Human readable
export const defaultDrawingFunctions: DifferDrawingFns = {
  addition: text => k.underline(k.green(text)),
  removal: text => k.underline(k.red(text)),
  change: text => k.underline(k.yellow(text)),
  move: text => k.underline(k.blue(text))
}

// Testing friendly
export const simplifiedDrawingFunctions: DifferDrawingFns = {
  addition: text => `➕${text}➕`,
  removal: text => `➖${text}➖`,
  change: text => `✏️${text}✏️`,
  move: text => `🔀${text}🔀`
}

export function applyChangesToSources(sourceA: string, sourceB: string, changes: Change[], drawFunctions?: DifferDrawingFns) {
  const drawingFunctions: DifferDrawingFns = { ...defaultDrawingFunctions, ...drawFunctions }

  let charsA = sourceA.split('')
  let charsB = sourceB.split('')

  function applyStyle(chars: string[], start: number, end: number, colorFn: DrawingFn) {
    const head = chars.slice(0, start);

    const text = chars.slice(start, end).join('')

    const tail = chars.slice(end, chars.length)

    return [...head, colorFn(text), ...tail]
  }

  // Used to track the characters removed so that we can print property, for example
  // chars = ['a', 'b', 'c' ]
  // After we merge 'a' with 'b', c is now at index 1, instead of 2

  let aOffset = 0;
  let bOffset = 0

  for (const { rangeA, rangeB, type } of changes) {
    switch (type) {
      case ChangeType.addition: {
        const { start, end } = getRanges(rangeB, bOffset)
        charsB = applyStyle(charsB, start, end, drawingFunctions.addition)

        // The reason of the - 1 is as follows:
        // If you have a range 3 to 6, means that the characters at index 3, 4 and 5 will be compacted into one
        // So, 6 - 3 is 3 minus 1 which is the length of the new character
        bOffset += (end - start) - 1
        break;
      }

      case ChangeType.removal: {
        const { start, end } = getRanges(rangeA, aOffset)
        charsA = applyStyle(charsA, start, end, drawingFunctions.removal)

        // The - 1 part is explained above
        aOffset += (end - start) - 1
        break;
      }

      default:
        console.log('Unhandled type', type)
    }
  }

  return { sourceA: charsA.join(''), sourceB: charsB.join('') }
}

function getRanges(range: Range | undefined, offset: number) {
  return {
    start: range?.start ? range.start - offset : 0,
    end: range?.end ? range?.end - offset : 0
  }
}
