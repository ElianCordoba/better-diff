import { _context } from ".";
import { DiffType } from "../types";
import { range } from "../utils";
import { Node } from "./node";
import { Sequence, Segment } from "./types";

interface ChangeSegment {
  type: DiffType;
  start: Node;
  end: Node;
}

export class Change {
  type: DiffType;
  segments: ChangeSegment[];

  constructor(type: DiffType, segments: ChangeSegment[]) {
    this.type = type;
    this.segments = segments;
  }
}

// SCORE FN PARAMETERS
const SCORE_THRESHOLD = 80
const MAX_NODE_SKIPS = 5

export function getSequence(nodeA: Node, nodeB: Node): Sequence {
  const segments: Segment[] = []
  const { iterA, iterB } = _context

  let bestSequence = 1;
  let skips = 0;

  // Where the segment starts
  let segmentAStart = nodeA.id
  let segmentBStart = nodeB.id

  let indexA = nodeA.id
  let indexB = nodeB.id

  mainLoop: while (true) {
    // TODO-2 First iteration already has the nodes
    const nextA = iterA.nextArray(indexA);
    const nextB = iterB.nextArray(indexB);

    // If one of the iterators ends then there is no more search to do
    if (!nextA || !nextB) {
      segments.push({
        type: DiffType.move,
        a: [segmentAStart, indexA - 1],
        b: [segmentBStart, indexB - 1]
      })
      break mainLoop;
    }

    // Here two things can happen, either the match continues so we keep on advancing the cursors
    if (equals(nextA, nextB)) {
      bestSequence++
      indexA++
      indexB++
      continue
    }

    // Or, we find a discrepancy. Before try to skip nodes to recover the match we record the current segment
    segments.push({
      type: DiffType.move,
      a: [segmentAStart, indexA - 1],
      b: [segmentBStart, indexB - 1]
    })

    // TODO-2 This could be a source of Change type diff, maybe 
    // "A B C" transformed into "A b C" where "B" changed into "b"
    // if (areNodesSimilar(nextA, nextB)) {
    //   continue
    // }

    // We will try match the current B node with the following N nodes on A

    let numberOfSkips = 0

    // Look until we reach the skip limit or the end of the iterator, whatever happens first
    const lookForwardUntil = Math.min(indexA + MAX_NODE_SKIPS, iterA.nodes.length)

    // Start by skipping the current node
    for (const nextIndexA of range(indexA + 1, lookForwardUntil)) {
      numberOfSkips++

      const newCandidate = iterA.peek(nextIndexA)!

      // We found a match, so we will resume the matching in a new segment from there
      if (equals(newCandidate, nextB)) {
        segmentAStart = nextIndexA
        segmentBStart = indexB
        indexA = nextIndexA
        skips = numberOfSkips
        continue mainLoop
      }
    }

    // We didn't find a candidate after advancing the cursor, we are done
    break
  }

  return {
    starterNode: nodeB,
    length: bestSequence,
    skips,
    segments
  }

}

function equals(nodeOne: Node, nodeTwo: Node): boolean {
  return nodeOne.kind === nodeTwo.kind && nodeOne.text === nodeTwo.text;
}

// function areNodesSimilar(nodeA: Node, nodeB: Node) {
//   const similarity = 80

//   // TODO-2 move to options
//   if (similarity <= SCORE_THRESHOLD) {
//     return true
//   } else {
//     return false
//   }
// }

// export function findBestSequence() {
//   const { iterA, iterB } = _context;

//   const sequences: Change[] = []
//   for (const node of iterA.nodes) {
//     if (node.matched) {
//       continue
//     }

//     const candidates = iterB.getSimilarNodes(node)

//     if (candidates.length === 0) {
//       // Deletion
//     }

//     for (const candidate of candidates) {
//       const lcs = getBestSequence(candidate, iterB)

//       sequences.push(lcs)
//     }
//   }
// }

// export function getSequence(nodeA: Node, nodeB: Node): Sequence {
//   const { iterA, iterB } = _context

//   let bestSequence = 1;

//   let indexA = nodeA.id
//   let indexB = nodeB.id

//   while (true) {
//     const nextA = iterA.peek(indexA);
//     const nextB = iterB.peek(indexB);

//     if (!nextA || !nextB) {
//       break;
//     }

//     if (!areNodesSimilar(nextA, nextB)) {
//       break;
//     }

//     indexA = stepFn(indexA);
//     indexB = stepFn(indexB);

//     bestSequence++;
//   }
// }