import { _context, _options } from "..";
import { DiffType } from "../types";
import { Diff } from "../data_structures/diff";
import { asciiRenderFn, assert, fail, RenderFn } from "../debug";
import { getUpdatedLineMap } from "../alignment/text_aligner";

import { Side } from "../shared/language";

export function applyChangesToSources(
  sourceA: string,
  sourceB: string,
  changes: Diff[],
  renderFn = asciiRenderFn,
) {
  let charsA = sourceA.split("");
  let charsB = sourceB.split("");

  // Start at 1 since it's more human friendly
  let moveCounter = 1;

  for (const { rangeA, rangeB, type } of changes) {
    switch (type) {
      case DiffType.addition: {
        const { start, end } = rangeB!;
        charsB = getSourceWithChange(
          charsB,
          start,
          end,
          renderFn[DiffType.addition],
        );
        break;
      }

      case DiffType.deletion: {
        const { start, end } = rangeA!;
        charsA = getSourceWithChange(
          charsA,
          start,
          end,
          renderFn[DiffType.deletion],
        );
        break;
      }

      case DiffType.move: {
        const resultA = rangeA!;
        charsA = getSourceWithChange(
          charsA,
          resultA.start,
          resultA.end,
          renderFn[DiffType.move],
        );

        const resultB = rangeB!;
        charsB = getSourceWithChange(
          charsB,
          resultB.start,
          resultB.end,
          renderFn[DiffType.move],
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
  // This is to handle cases like EndOfFile
  // TODO: Think if this is the best way to handle this, maybe we can just ignore the EOF node altogether or modify it
  if (start === end) {
    return chars;
  }

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

export function applyAlignments(sourceA: string, sourceB: string, changes: Diff[]): { sourceA: string; sourceB: string; changes: Diff[] } {
  // Handy for debugging
  // _context.textAligner.draw()

  sourceA = getTextAligned(Side.a, changes);
  sourceB = getTextAligned(Side.b, changes);

  return {
    sourceA,
    sourceB,
    changes,
  };
}

export function getTextAligned(side: Side, changes: Diff[]) {
  const { textAligner, sourceA, sourceB } = _context;
  const lineOffsets = textAligner[side];

  let source = side === Side.a ? sourceA : sourceB;
  const lines = source.split("\n");

  if (lineOffsets.size === 0) {
    return source;
  }

  const alignmentText = _options.alignmentText;
  let lineMap = new Map(textAligner.getLineMap(side));

  for (const { lineNumber } of lineOffsets.values()) {
    lines.splice(lineNumber - 1, 0, alignmentText);
    // const realLineNumber = textAligner.getOffsettedLineNumber(side, lineNumber);

    // let insertAt = lineMap.get(realLineNumber)!;

    // // Insert at will be undefined if the line we are tring to insert to is not present on the other side, for example
    // // If you try to insert line 5 but the other source only has 3 line, we will append it at the end
    // if (insertAt === undefined) {
    //   insertAt = textAligner.getLastLineStart(side);
    // }

    // source = source.slice(0, insertAt) + alignmentText + source.slice(insertAt);

    // lineMap = getUpdatedLineMap(source);

    updateChanges(changes, side, lineMap.get(lineNumber)!);
  }

  source = lines.join("\n");
  lineMap = getUpdatedLineMap(source);

  return source;
}

// Iterate for each change
// Only take the ones with the proper range
// Only take the ones that happen after the start pos
function updateChanges(changes: Diff[], sideToUpdate: Side, startPosition: number) {
  const textAlignmentLength = _options.alignmentText.length + 1;

  // Side where the alignment happened, thus the side we need to recalculate the ranges of the changes
  const changesToSkip = sideToUpdate === Side.a ? DiffType.addition : DiffType.deletion;
  const rangeToUpdate = sideToUpdate === Side.a ? "rangeA" : "rangeB";

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    // Skip type of changes we don't want
    if (change.type === changesToSkip) {
      continue;
    }

    if (change[rangeToUpdate]!.start >= startPosition) {
      change[rangeToUpdate]!.start += textAlignmentLength;
      change[rangeToUpdate]!.end += textAlignmentLength;
    }

    changes[i] = change;
  }
}
