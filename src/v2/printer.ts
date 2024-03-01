import { asciiRenderFn, assert, createTextTable, fail, RenderFn } from "../debug";
import { DiffType } from "../types";
import { Change } from "./diff";
import { getIndexesFromSegment } from "./utils";
import { Iterator } from "./iterator";
import { _context } from ".";
import colorFn from "kleur";

export function applyChangesToSources(
  sourceA: string,
  sourceB: string,
  changes: Change[],
  renderFn = asciiRenderFn,
) {
  let charsA = sourceA.split("");
  let charsB = sourceB.split("");

  const { iterA, iterB } = _context;

  for (const change of changes) {
    switch (change.type) {
      case DiffType.addition: {
        assert(change.segments.length === 1);

        const { b } = getIndexesFromSegment(change.segments[0]);

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
          renderFn[DiffType.addition],
        );
        break;
      }

      case DiffType.deletion: {
        assert(change.segments.length === 1);

        const { a } = getIndexesFromSegment(change.segments[0]);

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
          renderFn[DiffType.deletion],
        );
        break;
      }

      case DiffType.move: {
        for (const segment of change.segments) {
          const { a, b } = getIndexesFromSegment(segment);

          const { start: startIndexA, end: endIndexA } = a;
          const { start: startIndexB, end: endIndexB } = b;

          const [startA, endA] = getStringPositionsFromRange(
            iterA,
            startIndexA,
            endIndexA - 1,
          );
          const [startB, endB] = getStringPositionsFromRange(
            iterB,
            startIndexB,
            endIndexB - 1,
          );

          charsA = getSourceWithChange(
            charsA,
            startA,
            endA,
            renderFn[DiffType.move],
          );
          charsB = getSourceWithChange(
            charsB,
            startB,
            endB,
            renderFn[DiffType.move],
          );
        }
        break;
      }

      default:
        fail(`Unhandled type "${change.type}"`);
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

  // Since we might display the changes in a table, where we split by newlines, simply coloring the whole segment won't work, for example:
  //
  // (COLOR_START) a
  //  b (COLOR END)
  //
  // When splitted you will get ["(COLOR_START) a", " b (COLOR END)"] where only the first line would be colored, not the second
  // So to fix it we wrap all the tokens individually
  //
  // (COLOR_START) a (COLOR END)
  // (COLOR_START) b (COLOR END)
  //
  // So that when splitted you get ["(COLOR_START) a (COLOR END)", "(COLOR_START) b (COLOR END)"] which produces the desired output
  text = text
    .split(" ")
    .map((x) => colorFn(x))
    .join(" ");

  return [...head, colorFn(text), ...compliment, ...tail];
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
    const [startA, endA] = getStringPositionsFromRange(iterA, a.start, a.end - 1);
    const [startB, endB] = getStringPositionsFromRange(iterB, b.start, b.end - 1);

    const color = getColor();

    charsA = getSourceWithChange(charsA, startA, endA, color);
    charsB = getSourceWithChange(charsB, startB, endB, color);
  }

  return {
    a: charsA.join(""),
    b: charsB.join(""),
  };
}

export function prettyPrintChanges(a: string, b: string, changes: Change[]) {
  let sequenceCounter = -1;
  for (const change of changes) {
    sequenceCounter++;
    console.log(
      `\n---------- Starter ${change.startNode.prettyKind} ${`"${change.startNode.text}"` || ""} Length: ${change.length} Segments ${change.segments.length} Skips: ${change.skips} ----------\n`,
    );
    const sourcesWithColor = getPrettyStringFromChange(change, a, b);

    const table = createTextTable(sourcesWithColor.a, sourcesWithColor.b);

    console.log(table);

    resetColorRoulette();
  }
}
