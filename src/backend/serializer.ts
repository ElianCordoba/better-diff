import { Diff } from "../data_structures/diff";
import { DiffType, Range } from "../types";
import { range } from "../utils";
import { fail } from "../debug";
import { _context } from "../index";
import { getLineMap } from "../frontend/utils";

// This is the data structure that it's sent to the frontend to display the diffs, it's an array of arrays of chunks, where the first level represents a line in the source code and it's sub-arrays represent the chunks of code of that line:
//
// - Code: `
//   console.log(123)
//   return 1 + 2
// `
//
// - Server response:
// [
//   (line 1)
//   [
//     { text: "console.log(123)", type: RenderInstruction.default }
//   ],
//
//   (line 2)
//   [
//     { text: "return", type: RenderInstruction.default },
//     { text: "1 + 2", type: RenderInstruction.addition }
//   ],
// ]
export interface SerializedResponse {
  chunksA: SourceChunk[][];
  chunksB: SourceChunk[][];
}

interface SourceChunk {
  type: RenderInstruction;
  text: string;
  moveNumber: string;
}

enum RenderInstruction {
  // No text decoration
  default = "default",

  // Text with color
  addition = "addition",
  deletion = "deletion",
  move = "move",
}

export function serialize(
  a: string,
  b: string,
  diffs: Diff[],
): SerializedResponse {
  const charsA = getChars(a);
  const charsB = getChars(b);

  // We first need to "mark" the characters that were affected by a change, for example:
  //
  // print ➕'hi'➕
  //
  // (Emojis wont be present, is just to denote the added code), we will end up with
  // [ "p", "r", "i", "n", "t", " "] as characters with type "default", meaning that they are unchanged and ["'", "h", "i", "'"] as characters added
  // later, we will merge together the characters into chunks of same type
  for (let i = 0; i < diffs.length; i++) {
    const { type, rangeA, rangeB, indexesA } = diffs[i];

    switch (type) {
      case DiffType.deletion: {
        markChars(RenderInstruction.deletion, rangeA!, charsA);
        break;
      }

      case DiffType.addition: {
        markChars(RenderInstruction.addition, rangeB!, charsB);
        break;
      }

      case DiffType.move: {
        const moveNumber = _context.iterA.nodes[indexesA?.at(0)!].matchNumber;
        markChars(RenderInstruction.move, rangeA!, charsA, moveNumber);
        markChars(RenderInstruction.move, rangeB!, charsB, moveNumber);
        break;
      }

      default:
        fail(`Unhandled type "${type}"`);
    }
  }

  const rawLinesA = getSourceChunks(a, charsA);
  const rawLinesB = getSourceChunks(b, charsB);

  return {
    chunksA: compactLines(rawLinesA),
    chunksB: compactLines(rawLinesB),
  };
}

function markChars(type: RenderInstruction, _range: Range, chars: SourceChunk[], moveNumber: string | number = "") {
  const { start, end } = _range;
  for (const i of range(start, end)) {
    chars[i].type = type;
    chars[i].moveNumber = moveNumber ? String(moveNumber) : "";
  }
}

/**
 * For more details read the interface definition of "SerializedResponse" {@link SerializedResponse}
 */
function getSourceChunks(source: string, chars: SourceChunk[]) {
  const lineMap = getLineMap(source);

  const lines = [];

  // Buffer to store all the chunks of a given line, emptied after the line ends
  let lineChars: SourceChunk[] = [];
  let currentLine = 0;
  let currentLineEnd = lineMap[currentLine + 1];

  for (let i = 0; i < chars.length; i++) {
    const currentChar = chars[i];

    // Loop until the current line ends
    if (i < currentLineEnd) {
      lineChars.push(currentChar);
      continue;
    }

    // We completed the line, move into the next one

    lines.push(lineChars);
    lineChars = [];

    currentLine++;
    currentLineEnd = lineMap[currentLine + 1] || chars.length;

    // Important to push the current chunk to the buffer, otherwise we will skip it
    lineChars.push(currentChar);
  }

  // Push last line
  lines.push(lineChars);

  return lines;
}

// Tries to stick together as many chunks as it can, only doing so if they are compatible
function compactLines(rawLines: SourceChunk[][]): SourceChunk[][] {
  const lines = [...rawLines];
  for (const line of lines) {
    let offset = 0;
    for (let i = 0; i < line.length + offset; i++) {
      const currentPosition = i - offset;
      const previousPosition = currentPosition - 1;

      const currentChar = line[currentPosition];
      const previousChar = line[previousPosition];

      if (canCompact(currentChar, previousChar)) {
        const newChar = {
          text: previousChar.text + currentChar.text,
          type: currentChar.type,
          moveNumber: currentChar.moveNumber,
        };
        line.splice(previousPosition, 2, newChar);
        offset += 1;
      }
    }
  }

  return lines;
}

function getChars(str: string): SourceChunk[] {
  return str.split("").map((text) => ({ text, type: RenderInstruction.default, moveNumber: "" }));
}

// Check if chunks are compatible
function canCompact(current: SourceChunk, previous: SourceChunk | undefined): boolean {
  if (!previous) {
    return false;
  }

  return current.type === previous.type && current.moveNumber === previous.moveNumber;
}
