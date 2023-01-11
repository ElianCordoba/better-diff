
import { Change } from "./change";
import { ChangeType, RenderInstruction, Range, SourceChunk, ServerResponse } from "./types";
import { getRanges } from "./utils";
import { Node } from './node'
import { getLines } from "./ts-util";

export function serialize(
  a: string,
  b: string,
  changes: Change[]
): ServerResponse {
  let linesA = getLines(a)
  let linesB = getLines(b)

  let chunksA = getChunks(linesA)
  let chunksB = getChunks(linesB)

  for (const { rangeA, rangeB, type, nodeA, nodeB } of changes) {
    switch (type) {
      case ChangeType.deletion: {
        chunksA = insertNewChunks(RenderInstruction.deletion, rangeA!, nodeA!, chunksA)
        break;
      }

      case ChangeType.addition: {
        chunksB = insertNewChunks(RenderInstruction.addition, rangeB!, nodeB!, chunksB)
        break;
      }

      case ChangeType.move: {
        chunksA = insertNewChunks(RenderInstruction.move, rangeA!, nodeA!, chunksA)
        chunksB = insertNewChunks(RenderInstruction.move, rangeB!, nodeB!, chunksB)
        break;
      }

      default:
        throw new Error(`Unhandled type "${type}"`);
    }
  }

  return {
    chunksA: chunksA,
    chunksB: chunksB
  }
}

function insertNewChunks(renderInstruction: RenderInstruction, range: Range, node: Node, allChunks: SourceChunk[][]) {
  const _range = getRanges(range)

  const [targetChunk, indexOfChunk] = getChunk(allChunks, _range, node)

  const chunkId = node.matchNumber
  const indexOfLine = node.lineNumberStart! - 1

  const chunks = divideChunk(targetChunk, _range, renderInstruction, chunkId)
  return upsert(allChunks, chunks, indexOfLine, indexOfChunk)
}

function getChunks(lines: string[]) {
  const result: SourceChunk[][] = []
  lines.map((line, i) => {
    const start = result[i - 1]?.[0]?.end || 0
    const end = start + line.length

    result.push([
      {
        text: line,
        type: RenderInstruction.default,
        start,
        end,
      } as SourceChunk
    ])
  })

  return result
}

function getChunk(chunks: SourceChunk[][], wanted: Range, node: Node): [SourceChunk, number] {
  // Line number are 1 indexed
  const lineChunks = chunks[node.lineNumberStart - 1]

  // Fast-path
  if (lineChunks.length === 1) {
    return [lineChunks[0], 0]
  }

  const index = lineChunks.findIndex(({ start, end }) => wanted.start >= start && wanted.end <= end)

  if (index === -1) {
    throw new Error('Chunk not found')
  }

  return [lineChunks[index], index]
}

// Insert and update
function upsert<T extends any[]>(array: T[], newItems: T, indexOfLine: number, indexOfChunk: number) {
  const copy = [...array]
  copy[indexOfLine].splice(indexOfChunk, 1, ...newItems)

  return copy
}

function divideChunk(
  chunk: SourceChunk,
  range: Range, newType: RenderInstruction, id?: number): SourceChunk[] {
  const from = range.start - chunk.start
  const to = range.end - chunk.start

  const chars = chunk.text.split('');

  const newChunkText = chars.slice(from, to).join('')

  const head = chars.slice(0, from).join('')
  const tail = chars.slice(to, chars.length).join('')

  const result: SourceChunk[] = []
  let hasHead = false
  if (head !== '') {
    hasHead = true
    result.push({
      type: chunk.type,
      text: head,
      start: chunk.start,
      end: chunk.start + head.length,
    })
  }

  const newStart = hasHead ? result[0].end : chunk.start

  const newChunk: SourceChunk = {
    type: newType,
    text: newChunkText,
    start: newStart,
    end: newStart + newChunkText.length,
  }

  if (id) {
    newChunk.id = id
  }

  result.push(newChunk)

  if (tail !== '') {
    result.push({
      type: chunk.type,
      text: tail,
      start: newChunk.end,
      end: newChunk.end + tail.length,
    })
  }

  if (result.at(0)?.start !== chunk.start) {
    throw new Error("Start don't match")
  }

  if (result.at(-1)?.end !== chunk.end) {
    throw new Error("End don't match")
  }

  return result
}