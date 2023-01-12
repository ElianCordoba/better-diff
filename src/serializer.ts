import { Change } from "./change";
import { ChangeType, Range, RenderInstruction, ServerResponse, SourceChunk } from "./types";
import { getRanges } from "./utils";
import { Node } from "./node";
import { getArrayOrLines } from "./ts-util";

export function serialize(
  a: string,
  b: string,
  changes: Change[],
): ServerResponse {
  const linesA = getArrayOrLines(a);
  const linesB = getArrayOrLines(b);

  let chunksA = getChunks(linesA);
  let chunksB = getChunks(linesB);

  for (const { rangeA, rangeB, type, nodeA, nodeB } of changes) {
    switch (type) {
      case ChangeType.deletion: {
        chunksA = insertNewChunks(RenderInstruction.deletion, rangeA!, nodeA!, chunksA);
        break;
      }

      case ChangeType.addition: {
        chunksB = insertNewChunks(RenderInstruction.addition, rangeB!, nodeB!, chunksB);
        break;
      }

      case ChangeType.move: {
        chunksA = insertNewChunks(RenderInstruction.move, rangeA!, nodeA!, chunksA);
        chunksB = insertNewChunks(RenderInstruction.move, rangeB!, nodeB!, chunksB);
        break;
      }

      default:
        throw new Error(`Unhandled type "${type}"`);
    }
  }

  return {
    chunksA: chunksA,
    chunksB: chunksB,
  };
}

// Insert new chunks (1 to 3) in the position of an old one, replacing it, for example given:
//
// chunks: [ [1], [2], [3] ]
// Let say we will split it into two new chunks, 2.2 and 2.5, the result would be:
// chunks [ [1], [2.2], [2.5], [3] ]
function insertNewChunks(renderInstruction: RenderInstruction, range: Range, node: Node, allChunks: SourceChunk[][]) {
  const _range = getRanges(range);

  // Chunk we are going to update, and it's index
  const [targetChunk, indexOfChunk] = getChunk(allChunks, _range, node);

  const chunkId = node.matchNumber;
  const indexOfLine = node.lineNumberStart! - 1;

  // Chunks that are going to replace the existing one
  const chunks = divideChunk(targetChunk, _range, renderInstruction, chunkId);

  return upsert(allChunks, chunks, indexOfLine, indexOfChunk);
}

function getChunks(lines: string[]) {
  const result: SourceChunk[][] = [];
  lines.map((line, i) => {
    const start = result[i - 1]?.[0]?.end || 0;
    const end = start + line.length;

    result.push([
      {
        text: line,
        type: RenderInstruction.default,
        start,
        end,
      } as SourceChunk,
    ]);
  });

  return result;
}

// Get a chunk based on range. Each chunk covers a unique, sequential and continuous of ranges, such as
// [0, 4], [4, 7], [7, 12]
function getChunk(chunks: SourceChunk[][], wanted: Range, node: Node): [SourceChunk, number] {
  // Line number are 1-indexed
  const lineChunks = chunks[node.lineNumberStart - 1];

  // Fast-path if there is only one chunk in the line
  if (lineChunks.length === 1) {
    return [lineChunks[0], 0];
  }

  // The range needs to be inside the chunk range, for example:
  // A chunk with the range [7, 22] includes the range [7, 10], [13, 14] but not [6, 10] or [7, 23]
  const index = lineChunks.findIndex(({ start, end }) => wanted.start >= start && wanted.end <= end);

  if (index === -1) {
    throw new Error("Chunk not found");
  }

  return [lineChunks[index], index];
}

// Insert and update in a given index
function upsert<T extends unknown[]>(array: T[], newItems: T, indexOfLine: number, indexOfChunk: number) {
  const copy = [...array];
  copy[indexOfLine].splice(indexOfChunk, 1, ...newItems);

  return copy;
}

// Divide and update a chunk in up to 3 parts. A chunk may be replaced completely, may update the later or former part of the string,
// or may update a part in the middle, leaving with a head and tail untouched (same type) but a new middle part
function divideChunk(
  chunk: SourceChunk,
  range: Range,
  newType: RenderInstruction,
  id?: number,
): SourceChunk[] {
  // We need to offset the start and end, because a start could be at position 17 but the strings starts at 0
  const from = range.start - chunk.start;
  const to = range.end - chunk.start;

  const chars = chunk.text.split("");

  const newChunkText = chars.slice(from, to).join("");

  const head = chars.slice(0, from).join("");
  const tail = chars.slice(to, chars.length).join("");

  const result: SourceChunk[] = [];

  // We now construct the chunks, it's in a way a linked list because where one finished the other one starts

  let hasHead = false;
  if (head !== "") {
    hasHead = true;

    result.push({
      type: chunk.type,
      text: head,
      // Same start as the existing chunk
      start: chunk.start,
      // Includes the width of the string
      end: chunk.start + head.length,
    });
  }

  // If there was a new head, we take it's end as the start point, otherwise we take existing chunk start
  const newStart = hasHead ? result[0].end : chunk.start;

  const newChunk: SourceChunk = {
    type: newType,
    text: newChunkText,
    start: newStart,
    // Again, include the width if the string
    end: newStart + newChunkText.length,
  };

  // If it's a move we include the id so that we can link the two parts together (a and b) when hovering the diff
  if (id) {
    newChunk.id = id;
  }

  result.push(newChunk);

  if (tail !== "") {
    result.push({
      type: chunk.type,
      text: tail,
      // For sure we have a new chunk before, so we take it's end as the start position
      start: newChunk.end,
      // And again, we include the width
      end: newChunk.end + tail.length,
    });
  }

  // The following are sanity chunks to make sure the original range is respected

  if (result.at(0)?.start !== chunk.start) {
    throw new Error("Start don't match");
  }

  if (result.at(-1)?.end !== chunk.end) {
    throw new Error("End don't match");
  }

  return result;
}
