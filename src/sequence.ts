import { assert, fail } from "./debug";
import { Node } from "./node";
import { equals, getClosingNode, getPrettyKind } from "./utils";
import { Iterator } from "./iterator";
import { Side } from "./types";

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

interface GetLCS {
  a: Node;
  b: Node;
  candidatesAtoB: number[];
  candidatesBtoA: number[];
  iterA: Iterator;
  iterB: Iterator;
}

export function getLCS({ a, b, candidatesAtoB, candidatesBtoA, iterA, iterB }: GetLCS) {
  const aSideLCS = candidatesAtoB.length ? pickLCSFromCandidates(a.index, candidatesAtoB, iterA, iterB) : { bestSequence: 0, startOfSequence: 0 };
  const bSideLCS = candidatesBtoA.length ? pickLCSFromCandidates(b.index, candidatesBtoA, iterB, iterA) : { bestSequence: 0, startOfSequence: 0 };

  // Length of the best sequence
  let lcs: number;
  let side: Side;

  // Start indexes for both iterators
  let indexA: number;
  let indexB: number;

  // For simplicity the A to B perspective has preference
  if (aSideLCS.bestSequence >= bSideLCS.bestSequence) {
    side = Side.a;
    lcs = aSideLCS.bestSequence;

    // If the best LCS is found on the A to B perspective, indexA is the current position since we moved on the b side
    indexA = a.index;
    indexB = aSideLCS.startOfSequence;
  } else {
    side = Side.b
    lcs = bSideLCS.bestSequence;

    // This is the opposite of the above branch, since the best LCS was on the A side, there is were we need to reposition the cursor
    indexA = bSideLCS.startOfSequence;
    indexB = b.index;
  }

  assert(lcs !== 0, "LCS resulted in 0");

  return {
    side,
    lcs,
    indexA,
    indexB,
  };
}

export function getSequenceLength(
  iterA: Iterator,
  iterB: Iterator,
  indexA: number,
  indexB: number,
): number {
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

  return sequence;
}

export interface LCSResult {
  bestSequence: number;
  startOfSequence: number;
}

// Given a node (based on it's index) and one or more candidates nodes on the opposite side, evaluate all the possibilities and return the best result and index of it
export function pickLCSFromCandidates(indexOfWanted: number, candidates: number[], iterA: Iterator, iterB: Iterator): LCSResult {
  let bestSequence = 0;
  let startOfSequence = 0;

  for (const candidateNodeIndex of candidates) {
    const newLCS = getSequenceLength(iterA, iterB, indexOfWanted, candidateNodeIndex);

    // Store the new result if it's better that the previous one based on the length of the sequence
    if (
      newLCS > bestSequence
    ) {
      bestSequence = newLCS;
      startOfSequence = candidateNodeIndex;
    }
  }

  if (bestSequence === 0) {
    fail('asd')
  }

  return { startOfSequence, bestSequence };
}
