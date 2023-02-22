import { assert } from "./debug";
import { Node } from "./node";
import { equals, getClosingNode, getPrettyKind } from "./utils";
import { Iterator } from "./iterator";
import { Change } from "./change";
import { ChangeType } from "./types";

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

interface TryGetLCSArgs {
  a: Node;
  b: Node;
  candidatesAtoB: number[];
  candidatesBtoA: number[];
  iterA: Iterator;
  iterB: Iterator
}

export function tryGetLCS({ a, b, candidatesAtoB, candidatesBtoA, iterA, iterB }: TryGetLCSArgs) {
  const lcsAtoB = candidatesAtoB.length ? getLCS(a, candidatesAtoB, iterA, iterB) : { bestResult: 0, bestIndex: 0 };
  const lcsBtoA = candidatesBtoA.length ? getLCS(b, candidatesBtoA, iterB, iterA) : { bestResult: 0, bestIndex: 0 };

  // In which index does the sequence start
  let startSequenceIndex: number;
  // Length of the best sequence
  let lcs: number;

  // Start indexes for both iterators
  let indexA: number;
  let indexB: number;

  // For simplicity the A to B perspective has preference
  if (lcsAtoB.bestResult >= lcsBtoA.bestResult) {
    startSequenceIndex = lcsAtoB.bestIndex;
    lcs = lcsAtoB.bestResult;

    // If the best LCS is found on the A to B perspective, indexA is the current position since we moved on the b side
    indexA = a.index;
    indexB = startSequenceIndex;
  } else {
    startSequenceIndex = lcsBtoA.bestIndex;
    lcs = lcsBtoA.bestResult;

    // This is the opposite of the above branch, since the best LCS was on the A side, there is were we need to reposition the cursor
    indexA = startSequenceIndex;
    indexB = b.index;
  }

  assert(lcs !== 0, "LCS resulted in 0");

  return {
    lcs,
    startSequenceIndex,
    indexA,
    indexB
  }
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
  bestIndex: number;
  bestResult: number;
}

export function getLCS(wanted: Node, candidates: number[], iterA: Iterator, iterB: Iterator): LCSResult {
  let bestResult = 0;
  let bestIndex = 0;

  for (const index of candidates) {
    const lcs = getSequenceLength(iterA, iterB, wanted.index, index);

    // Store the new result if it's better that the previous one based on the length of the sequence
    if (
      lcs > bestResult
    ) {
      bestResult = lcs;
      bestIndex = index;
    }
  }

  return { bestIndex, bestResult };
}