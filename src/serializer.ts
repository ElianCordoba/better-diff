
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

  _range.start = node.fullStart
  const targetChunk = getChunk(allChunks, _range, node)

  const chunkId = node.matchNumber

  const chunks = divideChunk(targetChunk, _range, renderInstruction, chunkId)
  return upsert(allChunks, node.lineNumberStart! - 1, chunks)
}

function getChunks({ lines, lineMap }: { lines: string[], lineMap: number[] }) {
  const result: SourceChunk[][] = []
  let offset = 0
  lines.map((line, i) => {
    const start = 0
    const end = line.length
    offset += lines[i - 1]?.length || 0

    result.push([
      {
        text: line,
        type: RenderInstruction.default,
        start,
        end,
        offset
      } satisfies SourceChunk
    ])
  })

  return result
}

function getChunk(chunks: SourceChunk[][], wanted: Range, node: Node): SourceChunk {
  // Line number are 1 indexed
  const lineChunks = chunks[node.lineNumberStart - 1]

  // Fast-path
  if (lineChunks.length === 1) {
    return lineChunks[0]
  }

  const index = lineChunks.findIndex((chunk) => {
    return wanted.start >= chunk.start && wanted.end <= chunk.end
  })

  if (index === -1) {
    throw new Error('Chunk not found')
  }

  return lineChunks[index]
}

// Insert and update
function upsert<T extends any[]>(array: T[], index: number, item: T) {
  const copy = [...array]
  copy.splice(index, 1, item)

  return copy
}

function divideChunk(chunk: SourceChunk, range: Range, newType: RenderInstruction, id?: number): SourceChunk[] {
  const from = range.start - chunk.offset
  const to = range.end - chunk.offset

  const chars = chunk.text.split('');

  const newChunkText = chars.slice(from, to).join('')

  const head = chars.slice(0, from).join('')
  const tail = chars.slice(to, chars.length).join('')

  const result: SourceChunk[] = []

  if (head !== '') {
    result.push({
      type: chunk.type,
      text: head,
      start: chunk.start,
      end: head.length,
      offset: chunk.offset
    })
  }

  const newChunk: SourceChunk = {
    type: newType,
    text: newChunkText,
    start: head.length + 1,
    end: head.length + newChunkText.length,
    offset: head.length
  }

  if (id) {
    newChunk.id = id
  }

  result.push(newChunk)

  if (tail !== '') {
    result.push({
      type: chunk.type,
      text: tail,
      start: newChunkText.length + 1,
      end: newChunkText.length + tail.length,
      offset: newChunkText.length
    })
  }

  return result
}