import { Change } from "./change";
import { ChangeType, RenderInstruction, Range, SourceChunk } from "./types";
import { getRanges } from "./utils";
import { Node } from './node'
import { getLines } from "./ts-util";

//ServerResponse
export function serialize(
  a: string,
  b: string,
  changes: Change[]
) {
  let linesA = getLines(a)
  let linesB = getLines(b)

  let resultA = getChunks(linesA)
  let resultB = getChunks(linesB)

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

  function divideChunk(chunk: SourceChunk, range: Range, newType: RenderInstruction): SourceChunk[] {
    const from = range.start - chunk.start
    const to = chunk.end - chunk.start

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
        end: head.length
      })
    }

    result.push({
      type: newType,
      text: newChunkText,
      start: head.length + 1,
      end: head.length + newChunkText.length
    })

    if (tail !== '') {
      result.push({
        type: chunk.type,
        text: tail,
        start: newChunkText.length + 1,
        end: newChunkText.length + tail.length
      })
    }

    return result
  }

  // Insert and update
  function upsert<T extends any[]>(array: T[], index: number, item: T) {
    const copy = [...array]
    copy.splice(index, 0, item)

    return copy
  }

  for (const { rangeA, rangeB, type, nodeA, nodeB } of changes) {
    switch (type) {
      case ChangeType.addition: {
        const range = getRanges(rangeB)
        const targetChunk = getChunk(resultB, range, nodeB!)

        const chunks = divideChunk(targetChunk, range, RenderInstruction.addition)
        resultB = upsert(resultB, nodeB?.lineNumberStart! - 1, chunks)
        break;
      }

      case ChangeType.deletion: {
        const range = getRanges(rangeA)
        const targetChunk = getChunk(resultA, range, nodeA!)

        const chunks = divideChunk(targetChunk, range, RenderInstruction.deletion)
        resultA = upsert(resultA, nodeA?.lineNumberStart! - 1, chunks)
        break;
      }

      case ChangeType.move: {
        break;
      }

      default:
        throw new Error(`Unhandled type "${type}"`);
    }
  }

  return {
    chunksA: resultA,
    chunksB: resultB
  }

}

function getChunks({ lines, lineMap }: { lines: string[], lineMap: number[] }) {
  const result: SourceChunk[][] = []

  lines.map((line, i) => {
    const start = lineMap[i]
    const end = lineMap[i + 1] - 1
    result.push([
      {
        text: line,
        type: RenderInstruction.default,
        start,
        end
      } satisfies SourceChunk
    ])
  })

  return result
}