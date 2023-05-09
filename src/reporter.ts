import { _context, getOptions } from ".";
import { ChangeType, Side } from "../src/types";
import { Change } from "./change";
import { assert, fail } from "./debug";
import { OffsetsMap, OffsetTracker } from "./offsetTracker";
import { range } from "./utils";
import { Iterator } from './iterator'
import { Node } from "./node";

//@ts-ignore TODO: Importing normally doesn't work with vitest
export const k = require("kleur");

type RenderFn = (text: string) => string;

export type DiffRendererFn = Record<ChangeType, RenderFn>

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
  [ChangeType.deletion]: colorFn.red,
  [ChangeType.addition]: colorFn.green,
  [ChangeType.move]: (text) => k.blue().underline(text),
};

// Testing friendly
export const asciiRenderFn: DiffRendererFn = {
  [ChangeType.deletion]: (text) => `➖${text}➖`,
  [ChangeType.addition]: (text) => `➕${text}➕`,
  [ChangeType.move]: (text) => `🔀${text}⏹️`,
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
          renderFn[ChangeType.addition],
        );
        break;
      }

      case ChangeType.deletion: {
        const { start, end } = rangeA!;
        charsA = getSourceWithChange(
          charsA,
          start,
          end,
          renderFn[ChangeType.deletion],
        );
        break;
      }

      case ChangeType.move: {
        const resultA = rangeA!;
        charsA = getSourceWithChange(
          charsA,
          resultA.start,
          resultA.end,
          renderFn[ChangeType.move],
        );

        const resultB = rangeB!;
        charsB = getSourceWithChange(
          charsB,
          resultB.start,
          resultB.end,
          renderFn[ChangeType.move],
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

export function applyAlignments(sourceA: string, sourceB: string, changes: Change[], offsets: OffsetTracker): { sourceA: string, sourceB: string, changes: Change[] } {
  const offsettedIndexesA = offsets.offsetsA
  const offsettedIndexesB = offsets.offsetsB

  // for (const ofA of offsettedIndexesA.values()) {
  //   const ofB = offsettedIndexesB.get(ofA.index)
  //   if (ofB?.numberOfNewLines === ofA.numberOfNewLines) {
  //     offsettedIndexesA.delete(ofA.index)
  //     offsettedIndexesB.delete(ofA.index)
  //   }
  // }

  sourceA = insertAlignments(Side.a, changes, offsettedIndexesA, sourceA, _context.iterA)
  sourceB = insertAlignments(Side.b, changes, offsettedIndexesB, sourceB, _context.iterB)

  return {
    sourceA,
    sourceB,
    changes
  }
}

function insertAlignments(side: Side, changes: Change[], offsets: OffsetsMap, source: string, iter: Iterator): string {
  if (offsets.size === 0) {
    return source
  }

  const alignmentText = getOptions().alignmentText

  for (const offset of offsets.values()) {
    // TODO: DOn't add them in the first place
    if (offset.numberOfNewLines === 0) {
      continue
    }


    const _offsetsFilled = _context.offsetTracker.getFilledOffsettedIndexes(side)

    const insertAt = findPointToInsertAlignment(iter, _offsetsFilled, offset.index)

    assert(insertAt !== undefined)

    for (const _ of range(0, offset.numberOfNewLines)) {
      source = source.slice(0, insertAt) + alignmentText + source.slice(insertAt);
    }

    // updateChanges(changes, offset.change?.index!, side, insertAt)
    updateChanges(changes, side, insertAt)
  }

  return source
}

function findPointToInsertAlignment(iter: Iterator, offsettedIndexes: (Node | undefined)[], targetIndex: number): number {
  // We know that targetIndex is the alignment position, so that wont be our anchor
  let currentIndex = targetIndex - 1

  while (true) {
    if (currentIndex < 0) {
      return 0
    }

    const current = offsettedIndexes[currentIndex]

    if (current) {
      // const node = iter.textNodes[currentIndex];
      // const lineToInsert = node.lineNumberStart === 0 ? 0 : node.lineNumberStart - 1
      // const startOfLine = _context.lineMapNodeTable[iter.side].get(lineToInsert)!
      // return startOfLine
      return iter.textNodes[currentIndex].end
    }

    currentIndex--
  }
}

// Iterate for each change
// Only take the ones with the proper range
// Only take the ones that happen after the start pos
function updateChanges(changes: Change[], sideToUpdate: Side, startPosition: number) {
  const alignmentText = getOptions().alignmentText

  // Side where the alignment happened, thus the side we need to recalculate the ranges of the changes
  const changesToSkip = sideToUpdate === Side.a ? ChangeType.addition : ChangeType.deletion
  const rangeToUpdate = sideToUpdate === Side.a ? 'rangeA' : 'rangeB'

  for (let i = 0; i < changes.length; i++) {
    // TODO-NOW
    // Don't update the change we just applied
    // if (i === currentChange) {
    //   continue
    // }
    const change = changes[i]
    // Skip type of changes we don't want
    if (change.type === changesToSkip) {
      continue
    }

    if (change[rangeToUpdate]!.start >= startPosition) {
      change[rangeToUpdate]!.start += alignmentText.length
      change[rangeToUpdate]!.end += alignmentText.length
    }

    changes[i] = change
  }
}

