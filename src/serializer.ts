import { Change } from "./change";
import { ChangeType, SourceChunk, Range, RenderInstruction, SerializedResponse } from "./types";
import { range } from "./utils";
import { getLineMap } from "./ts-util";
import { DebugFailure } from "./debug";

export function serialize(
  a: string,
  b: string,
  changes: Change[],
): SerializedResponse {
  const charsA: SourceChunk[] = a.split('').map(char => ({ text: char, type: RenderInstruction.default, moveNumber: '' }))
  const charsB: SourceChunk[] = b.split('').map(char => ({ text: char, type: RenderInstruction.default, moveNumber: '' }))

  function markChars(type: RenderInstruction, _range: Range, chars: SourceChunk[], moveNumber: number = -1) {

    const { start, end } = _range;
    for (const i of range(start, end)) {
      // if (type === RenderInstruction.deletion || type === RenderInstruction.move) {
      //   charsA[i].type = type
      // }

      // if (type === RenderInstruction.addition || type === RenderInstruction.move) {
      //   charsB[i].type = type
      // }

      chars[i].type = type
      chars[i].moveNumber = moveNumber ? String(moveNumber) : ''
    }
  }

  for (let i = 0; i < changes.length; i++) {
    const { type, rangeA, rangeB, nodeA, nodeB } = changes[i];

    switch (type) {
      case ChangeType.deletion: {
        markChars(RenderInstruction.deletion, rangeA!, charsA)
        break;
      }

      case ChangeType.addition: {
        markChars(RenderInstruction.addition, rangeB!, charsB)
        break;
      }

      case ChangeType.move: {
        const moveNumber = nodeA!.matchNumber
        markChars(RenderInstruction.move, rangeA!, charsA, moveNumber)
        markChars(RenderInstruction.move, rangeB!, charsB, moveNumber)
        break;
      }

      default:
        throw new DebugFailure(`Unhandled type "${type}"`);
    }
  }

  // Compact

  function getLines(source: string, chars: SourceChunk[]) {
    const lineMap = getLineMap(source)

    const lines = [];

    // Buffer to store all the characters of a given line, emptied after the line ends
    let lineChars: SourceChunk[] = []
    let currentLine = 0;
    let currentLineEnd = lineMap[currentLine + 1]

    for (let i = 0; i < chars.length; i++) {
      const currentChar = chars[i];


      // Loop until the current line ends
      if (i < currentLineEnd) {
        lineChars.push(currentChar)
        continue
      }

      // We completed the line, move into the next one

      lines.push(lineChars)
      lineChars = []

      currentLine++
      currentLineEnd = lineMap[currentLine + 1] || chars.length

      lineChars.push(currentChar)
    }

    // Push last line 
    lines.push(lineChars)

    return lines
  }

  function compactLines(rawLines: SourceChunk[][]): SourceChunk[][] {
    const lines = [...rawLines]
    for (const line of lines) {
      let offset = 0
      for (let i = 0; i < line.length + offset; i++) {
        const currentPosition = i - offset
        const previousPosition = currentPosition - 1

        const currentChar = line[currentPosition];
        const previousChar = line[previousPosition]

        if (canCompact(currentChar, previousChar)) {
          const newChar = {
            text: previousChar.text + currentChar.text,
            type: currentChar.type,
            moveNumber: currentChar.moveNumber
          }
          line.splice(previousPosition, 2, newChar)
          offset += 1
        }
      }
    }

    return lines
  }

  const rawLinesA = getLines(a, charsA)
  const rawLinesB = getLines(b, charsB)

  return {
    chunksA: compactLines(rawLinesA),
    chunksB: compactLines(rawLinesB),
  }
}

function canCompact(current: SourceChunk, previous: SourceChunk | undefined): boolean {
  if (!previous) {
    return false
  }

  return current.type === previous.type && current.moveNumber === previous.moveNumber
}