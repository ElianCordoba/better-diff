import ts from "typescript";
import Table from "cli-table3";
import { DiffType } from "./types";
import colorFn from "kleur";
import { getSourceWithChange } from "./backend/printer";
import { _context as _context2 } from "./v2/index";
import { Iterator } from "./v2/iterator";
import { getIndexesFromSegment } from "./v2/utils";
import { Change } from "./v2/diff";

enum ErrorType {
  DebugFailure = "DebugFailure",
  ServerError = "ServerError",
  UnhandledError = "DebugFailure",
}

class BaseError {
  constructor(
    public type: ErrorType,
    public message: string,
    public serializedError?: string,
    public extra?: unknown,
  ) {}
}

class DebugFailure extends BaseError {
  constructor(
    public message: string,
    public error?: Error,
    public extra?: unknown,
  ) {
    super(
      ErrorType.DebugFailure,
      message,
      error ? JSON.stringify(error) : undefined,
      extra,
    );
  }
}

export function fail(errorMessage?: string): never {
  throw new DebugFailure(errorMessage || "Assertion failed");
}

// It receives a function instead of a raw string so that the content gets evaluated lazily. Without this, an error message that
// uses the function `getPrettyKind` will trigger it independently if the assertion passes of not
export function assert<T>(
  condition: T,
  errorMessage?: () => string,
): asserts condition is NonNullable<T> {
  if (!condition) {
    fail(errorMessage?.());
  }
}

// Printing utils

export type RenderFn = (text: string) => string;

export type DiffRendererFn = Record<DiffType, RenderFn>;

// Pretty print. Human readable
export const prettyRenderFn: DiffRendererFn = {
  [DiffType.deletion]: colorFn.red,
  [DiffType.addition]: colorFn.green,
  [DiffType.move]: (text) => colorFn.blue().underline(text),
};

// Testing friendly
export const asciiRenderFn: DiffRendererFn = {
  [DiffType.deletion]: (text) => `➖${text}➖`,
  [DiffType.addition]: (text) => `➕${text}➕`,
  [DiffType.move]: (text) => `⏩${text}⏪`,
};

const _defaultTextTableOptions = {
  lineCounterStartAt: 1,
};

export function createTextTable(
  sourceA: string,
  sourceB: string,
  options?: typeof _defaultTextTableOptions,
) {
  const parsedOptions = { ..._defaultTextTableOptions, ...options };

  const aLines = sourceA.split("\n");
  const bLines = sourceB.split("\n");
  const maxLength = Math.max(aLines.length, bLines.length);

  const table = new Table({
    head: [
      colorFn.yellow("Nº"),
      colorFn.red("Source"),
      colorFn.green("Revision"),
    ],
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

export function getPrettyChangeType(type: DiffType, withColor = false): string {
  const renderFn = withColor ? prettyRenderFn[type] : (i: string) => i;
  switch (type) {
    case DiffType.deletion:
      return renderFn("Deletion");
    case DiffType.addition:
      return renderFn("Addition");
    case DiffType.move:
      return renderFn("Move");
  }
}

export function getPrettyKind(kind: number): string {
  return (ts as any).Debug.formatSyntaxKind(kind);
}

export function getNodeForPrinting(kind: number, text: string | undefined) {
  const isString = kind === ts.SyntaxKind.StringLiteral;

  let _text = "";

  if (text) {
    if (isString) {
      _text = `"${text}"`;
    } else {
      _text = text;
    }
  }

  return {
    kind: getPrettyKind(kind),
    text: _text,
  };
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

function getStringPositionsFromRange(
  iter: Iterator,
  indexStart: number,
  indexEnd: number,
): [start: number, end: number] {
  const start = iter.nodes[indexStart].start;
  const end = iter.nodes[indexEnd].end;

  return [start, end];
}

export function getPrettyStringFromChange(
  change: Change,
  sourceA: string,
  sourceB: string,
) {
  const { iterA, iterB } = _context2;
  let charsA = sourceA.split("");
  let charsB = sourceB.split("");

  for (const segment of change.segments) {
    const { a, b } = getIndexesFromSegment(segment);
    const [startA, endA] = getStringPositionsFromRange(iterA, a.start, a.end);
    const [startB, endB] = getStringPositionsFromRange(iterB, b.start, b.end);

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
