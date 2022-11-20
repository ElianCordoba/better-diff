import { compactChanges, getInitialDiffs } from "../src/main"
import { Change, ChangeType } from "../src/types"

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

  function applyStyle(chars: string[], from: number, to: number, colorFn: DrawingFn) {
    const head = chars.slice(0, from);

    const text = chars.slice(from, to).join('')

    const tail = chars.slice(to, chars.length)

    return [...head, colorFn(text), ...tail]
  }

  let from, to;
  for (const { rangeA, rangeB, type } of changes) {
    switch (type) {
      case ChangeType.addition:
        from = rangeB!.start
        to = rangeB!.end
        charsB = applyStyle(charsB, from, to, drawingFunctions.addition)
        break;

      case ChangeType.removal:
        from = rangeA!.start
        to = rangeA!.end
        charsA = applyStyle(charsA, from, to, drawingFunctions.removal)
        break;

      // TODO: Use change drawing func?
      case ChangeType.change:
        from = rangeB!.start
        to = rangeB!.end
        charsB = applyStyle(charsB, from, to, drawingFunctions.addition)

        from = rangeA!.start
        to = rangeA!.end
        charsA = applyStyle(charsA, from, to, drawingFunctions.removal)
        break;

      default:
        console.log('Unhandled type', type)
    }
  }

  return { sourceA: charsA.join(''), sourceB: charsB.join('') }
}

