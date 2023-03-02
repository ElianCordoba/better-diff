import { assert, fail } from "./debug";
import { Node } from "./node";
import { equals, getClosingNode, getPrettyKind } from "./utils";
import { Iterator } from "./iterator";

export class NodeMatchingStack {
  allowedKind: number[];
  values: Node[] = [];

  constructor(openNode: Node) {
    assert(openNode.isOpeningNode, `Expected a opening node when initializing a node-matching stack but found a ${openNode.prettyKind}`);

    const closeNodeKind = getClosingNode(openNode);
    this.allowedKind = [openNode.kind, closeNodeKind];
    this.values = [openNode];
  }

  add(node: Node) {
    assert(this.allowedKind.includes(node.kind), `Invalid kind provided to node-matching stack, expected either ${getPrettyKind(this.allowedKind[0])} or ${getPrettyKind(this.allowedKind[1])} but found ${node.prettyKind}`);

    if (node.isOpeningNode) {
      this.values.push(node);
    } else {
      this.values.pop();
    }
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

export function getSequenceLength(
  iterA: Iterator,
  iterB: Iterator,
  indexA: number,
  indexB: number,
): { indexA: number; indexB: number, sequence: number } {
  // Represents how long is the sequence
  let sequence = 0;

  while (true) {
    const nextA = iterA.peek(indexA);

    if (!nextA) {
      break;
    }

    const nextB = iterB.peek(indexB);

    if (!nextB) {
      break;
    }

    if (!equals(nextA, nextB)) {
      break;
    }

    indexA++;
    indexB++;
    sequence++;
  }

  return { indexA: indexA - sequence, indexB: indexB - sequence, sequence };
}

export interface LCSResult {
  bestSequence: number;
  indexA: number
  indexB: number
}

// Given a node (based on it's index) and one or more candidates nodes on the opposite side, evaluate all the possibilities and return the best result and index of it
export function getLCS(indexOfWanted: number, candidates: number[], iterA: Iterator, iterB: Iterator): LCSResult {
  let bestSequence = 0;
  let indexA = -1
  let indexB = -1

  for (const candidateNodeIndex of candidates) {
    const newLCS = getSequenceLength(iterA, iterB, indexOfWanted, candidateNodeIndex);

    // Store the new result if it's better that the previous one based on the length of the sequence
    if (
      newLCS.sequence > bestSequence
    ) {
      bestSequence = newLCS.sequence;
      // TODO: NON REVERSIBLE
      indexA = newLCS.indexA
      indexB = newLCS.indexB
    }
  }

  assert(indexA !== -1 && indexB !== -1)

  // if (bestSequence === 0) {
  //   fail("LCS resulted in 0");
  // }

  return { bestSequence, indexA, indexB };
}
