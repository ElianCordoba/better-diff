import Table from "cli-table3";
import colorFn from "kleur";

import { asciiRenderFn, assert, createTextTable, fail, prettyRenderFn, RenderFn } from "../debug";
import { DiffType, TypeMasks } from "../types";
import { capitalizeFirstLetter, getIndexesFromSegment } from "./utils";
import { Iterator } from "./iterator";
import { _context } from ".";
import { rangeEq } from "../utils";
import { Change } from "./change";

export function applyChangesToSources(
  sourceA: string,
  sourceB: string,
  changes: Change[],
  forDebug: boolean,
) {
  const renderFn = forDebug ? prettyRenderFn : asciiRenderFn;
  let charsA = sourceA.split("");
  let charsB = sourceB.split("");

  const { iterA, iterB } = _context;

  for (const change of changes) {
    const renderWith = renderFn[change.type];
    for (const segment of change.segments) {
      if (TypeMasks.AddOrMove & change.type) {
        const { b } = getIndexesFromSegment(segment);

        const { start: startIndex, end: endIndex } = b;

        const [start, end] = getStringPositionsFromRange(
          iterB,
          startIndex,
          endIndex - 1,
        );

        charsB = getSourceWithChange(
          charsB,
          start,
          end,
          renderWith,
          forDebug,
        );
      }

      if (TypeMasks.DelOrMove & change.type) {
        const { a } = getIndexesFromSegment(segment);

        const { start: startIndex, end: endIndex } = a;
        const [start, end] = getStringPositionsFromRange(
          iterA,
          startIndex,
          endIndex - 1,
        );

        charsA = getSourceWithChange(
          charsA,
          start,
          end,
          renderWith,
          forDebug,
        );
      }
    }
  }

  return { sourceA: charsA.join(""), sourceB: charsB.join("") };
}

export function getSourceWithChange(
  chars: string[],
  start: number,
  end: number,
  colorFn: RenderFn,
  // This will be true for `prettyRenderFn`, it enables patching the string in a way that it looks nice on the table. This patching would break the tests
  forDebug: boolean,
) {
  // This is to handle cases like EndOfFile
  // TODO: Think if this is the best way to handle this, maybe we can just ignore the EOF node altogether or modify it
  if (start === end) {
    return chars;
  }

  const head = chars.slice(0, start);

  let text = chars.slice(start, end).join("");

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

  if (!forDebug) {
    text = colorFn(text);
  } else if (text.includes("\n")) {
    // One edge case we need to be aware of is that the text highlighted may be across newlines so simply coloring the whole segment won't work, for example:
    //
    // (COLOR_START) a
    //  b (COLOR END)
    //
    // Later on the line the printer breaks down this code into newlines, so you get ["(COLOR_START) a", " b (COLOR END)"] where only the first line would be colored, not the second
    // So to fix it we check if the highlighted text crosses multiple lines, if so we wrap all the tokens individually:
    //
    // (COLOR_START) a (COLOR END)
    // (COLOR_START) b (COLOR END)
    //
    // So that when splitted you get ["(COLOR_START) a (COLOR END)", "(COLOR_START) b (COLOR END)"] which produces the desired output

    const lines = text.split("\n").map(colorFn);

    text = lines.join("\n");
  } else {
    // If the the to highline is in a single line we can just color the whole thing
    text = colorFn(text);
  }

  return [...head, text, ...compliment, ...tail];
}

export function getComplimentArray(
  length: number,
  fillInCharacter = "",
): string[] {
  assert(
    length >= 0,
    () => `Length of compliment array invalid. Got ${length}`,
  );

  return new Array(length).fill(fillInCharacter);
}

function getStringPositionsFromRange(
  iter: Iterator,
  indexStart: number,
  indexEnd: number,
): [start: number, end: number] {
  const start = iter.nodes[indexStart].start;
  const end = iter.nodes[indexEnd].end;

  return [start, end];
}

// V2
const COLOR_ROULETTE = [
  colorFn.red,
  colorFn.green,
  colorFn.yellow,
  colorFn.blue,
  colorFn.magenta,
  colorFn.cyan,
];

let _currentColor = -1;
export function getColor() {
  _currentColor++;

  if (_currentColor >= COLOR_ROULETTE.length) {
    _currentColor = 0;
  }

  return COLOR_ROULETTE[_currentColor];
}

function resetColorRoulette() {
  _currentColor = 0;
}

export function getPrettyStringFromChange(
  change: Change,
  sourceA: string,
  sourceB: string,
) {
  const { iterA, iterB } = _context;
  let charsA = sourceA.split("");
  let charsB = sourceB.split("");

  for (const segment of change.segments) {
    // switch diff type render add del move separtely
    const { a, b } = getIndexesFromSegment(segment);

    const color = prettyRenderFn[change.type];

    if (change.type & TypeMasks.DelOrMove) {
      const [startA, endA] = getStringPositionsFromRange(
        iterA,
        a.start,
        a.end - 1,
      );
      charsA = getSourceWithChange(charsA, startA, endA, color, true);
    }

    if (change.type & TypeMasks.AddOrMove) {
      const [startB, endB] = getStringPositionsFromRange(
        iterB,
        b.start,
        b.end - 1,
      );
      charsB = getSourceWithChange(charsB, startB, endB, color, true);
    }
  }

  return {
    a: charsA.join(""),
    b: charsB.join(""),
  };
}

export function prettyPrintSources(a: string, b: string) {
  console.log(createTextTable(a, b));
}

export function prettyPrintChanges(a: string, b: string, changes: Change[]) {
  const sourcesWithChanges = applyChangesToSources(
    a,
    b,
    changes,
    true,
  );
  console.log(
    createTextTable(sourcesWithChanges.sourceA, sourcesWithChanges.sourceB),
  );
}

export function prettyPrintChangesInSequence(
  a: string,
  b: string,
  changes: Change[],
  options: { sortByLength: boolean } = { sortByLength: true },
) {
  const table = new Table({
    head: [
      colorFn.magenta("Type"),
      colorFn.blue("Length"),
      colorFn.grey("Skips"),
      colorFn.cyan("Start"),
      colorFn.yellow("Line Nº"),
      colorFn.red("Source"),
      colorFn.green("Revision"),
    ],
    colAligns: ["center", "center", "center", "center"],
  });

  const sortedByLength = options.sortByLength ? changes.sort((a, b) => (a.textLength < b.textLength ? 1 : -1)) : changes;

  const lineNumberString = getLinesOfCodeString(a, b);

  for (const change of sortedByLength) {
    const changeName = capitalizeFirstLetter(DiffType[change.type]);
    const changeColorFn = prettyRenderFn[change.type];

    const sourceWithChange = getPrettyStringFromChange(change, a, b);

    table.push([
      changeColorFn(changeName),
      colorFn.blue(change.textLength),
      colorFn.grey(change.skips || "-"),
      colorFn.cyan(`"${change.startNode.text}"`),
      colorFn.yellow(lineNumberString),
      sourceWithChange.a,
      sourceWithChange.b,
    ]);
  }

  console.log(table.toString());
}

function getLinesOfCodeString(a: string, b: string) {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const linesOfCode = Math.max(aLines.length, bLines.length);

  let str = "";
  for (const lineNumber of rangeEq(1, linesOfCode)) {
    str += `${lineNumber}\n`;
  }

  return str;
}
