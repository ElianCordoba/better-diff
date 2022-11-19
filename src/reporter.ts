import { compactChanges, getInitialDiffs } from "../src/main"
import { Change, ChangeType } from "../src/types"
import { underline, green, red } from 'kleur'

function readSequence(chars: string[], from: number, to: number) {
  return chars.slice(from, to).join('')
}

export function applyChangesToSources(sourceA: string, sourceB: string, changes: Change[]) {
  const charsA = sourceA.split('')
  const charsB = sourceB.split('')

  function applyStyle(chars: string[], from: number, to: number, colorFn: any) {
    const textToMark = readSequence(chars, from, to)
    chars.splice(from, to, underline(colorFn(textToMark)))
  }

  let from, to;
  for (const { rangeA, rangeB, type } of changes) {
    switch (type) {
      case ChangeType.addition:
        from = rangeB!.start
        to = rangeB!.end
        applyStyle(charsB, from, to, green)
        break;

      case ChangeType.removal:
        from = rangeA!.start
        to = rangeA!.end
        applyStyle(charsA, from, to, red)
        break;

      case ChangeType.change:
        from = rangeB!.start
        to = rangeB!.end
        applyStyle(charsB, from, to, green)

        from = rangeA!.start
        to = rangeA!.end
        applyStyle(charsA, from, to, red)
        break;

      default:
        console.log('Unhandled type', type)
    }
  }

  return { sourceA: charsA.join(''), sourceB: charsB.join('') }
}

export function applyChangesToSources2(sourceA: string, sourceB: string, changes: Change[]) {
  const charsA = sourceA.split('')
  const charsB = sourceB.split('')

  for (const { rangeA, rangeB, type } of changes) {

    if (type === ChangeType.addition) {
      const from = rangeB!.start
      const to = rangeB!.end

      const textToMark = readSequence(charsB, from, to)

      charsB.splice(from, to, underline(green(textToMark)))

      continue
    }

    if (type === ChangeType.removal) {
      const from = rangeA!.start
      const to = rangeA!.end

      const textToMark = readSequence(charsA, from, to)

      charsB.splice(from, to, underline(red(textToMark)))

      continue
    }

    // A move, TODO
    console.log('Unknown type', type)
  }

  return { sourceA: charsA.join(''), sourceB: charsB.join('') }
}