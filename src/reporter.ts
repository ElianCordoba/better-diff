import Table from "cli-table3";

import { _context, getOptions } from ".";
import { ChangeType, Side } from "../src/types";
import { Change } from "./change";
import { assert, fail } from "./debug";
import { getUpdatedLineMap } from "./textAligner";

//@ts-ignore TODO: Importing normally doesn't work with vitest
export const k = require("kleur");

type RenderFn = (text: string) => string;

export type DiffRendererFn = Record<ChangeType, RenderFn>;

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
  [ChangeType.move]: (text) => `⏩${text}⏪`,
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

export function applyAlignments(sourceA: string, sourceB: string, changes: Change[]): { sourceA: string; sourceB: string; changes: Change[] } {
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

export function getTextAligned(side: Side, changes: Change[]) {
  const { textAligner, sourceA, sourceB } = _context;
  const lineOffsets = textAligner[side];

  let source = side === Side.a ? sourceA : sourceB;
  const lines = source.split('\n')

  if (lineOffsets.size === 0) {
    return source;
  }

  const alignmentText = getOptions().alignmentText;
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

  source = lines.join('\n')
  lineMap = getUpdatedLineMap(source);

  return source;
}

// Iterate for each change
// Only take the ones with the proper range
// Only take the ones that happen after the start pos
function updateChanges(changes: Change[], sideToUpdate: Side, startPosition: number) {
  const textAlignmentLength = getOptions().alignmentText.length + 1;

  // Side where the alignment happened, thus the side we need to recalculate the ranges of the changes
  const changesToSkip = sideToUpdate === Side.a ? ChangeType.addition : ChangeType.deletion;
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

const _defaultTextTableOptions = {
  lineCounterStartAt: 1
}

export function createTextTable(
  sourceA: string,
  sourceB: string,
  options?: typeof _defaultTextTableOptions
) {
  const parsedOptions = { ..._defaultTextTableOptions, ...options }

  const aLines = sourceA.split("\n");
  const bLines = sourceB.split("\n");
  const maxLength = Math.max(aLines.length, bLines.length);

  const table = new Table({
    head: [colorFn.yellow("Nº"), colorFn.red("Source"), colorFn.green("Revision")],
    colAligns: ["left", "left"],
    colWidths: [5, 30, 30],
    style: {
      compact: true,
    },
  });

  let lineNumber = parsedOptions.lineCounterStartAt;
  for (let i = 0; i < maxLength; i++) {
    const aLine = aLines[i] || "";
    const bLine = bLines[i] || "";

    table.push([lineNumber, aLine, bLine]);
    lineNumber++;
  }

  return table.toString();
}
