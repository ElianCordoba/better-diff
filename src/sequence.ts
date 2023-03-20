import { assert } from "./debug";
import { Node } from "./node";
import { equals, getClosingNode, getPrettyKind } from "./utils";
import { Iterator } from "./iterator";
import { Change } from "./change";

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

export function getSequence(
  iterA: Iterator,
  iterB: Iterator,
  indexA: number,
  indexB: number,
  direction = SequenceDirection.Forward
): LCSResult {
  const stepFn = direction === SequenceDirection.Forward ? (x: number) => x + 1 : (x: number) => x - 1
  let bestSequence = 0;

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

    indexA = stepFn(indexA);
    indexB = stepFn(indexB);

    bestSequence++;
  }

  return {
    bestSequence,
    indexA: indexA - bestSequence,
    indexB: indexB - bestSequence,
  };
}

export interface LCSResult {
  changes?: Change[]
  bestSequence: number;
  indexA: number;
  indexB: number;
}

export enum SequenceDirection {
  Forward = "Forward",
  Backward = "Backward"
}

// Given a node (based on it's index) and one or more candidates nodes on the opposite side, evaluate all the possibilities and return the best result and index of it
export function getLCS(indexOfWanted: number, candidates: number[], iterA: Iterator, iterB: Iterator, bothDirections = false): LCSResult {
  const fn = bothDirections ? getSequenceDual : getSequence

  let bestSequence = 0;
  let indexA = 0;
  let indexB = 0;

  for (const candidateNodeIndex of candidates) {
    const newLCS = fn(iterA, iterB, indexOfWanted, candidateNodeIndex, SequenceDirection.Forward);

    // Store the new result if it's better that the previous one based on the length of the sequence
    if (
      newLCS.bestSequence > bestSequence
    ) {
      bestSequence = newLCS.bestSequence;
      indexA = newLCS.indexA;
      indexB = newLCS.indexB;
    }
  }

  assert(bestSequence !== 0, "LCS resulted in 0");

  return { bestSequence, indexA, indexB };
}



export function getSequenceDual(
  iterA: Iterator,
  iterB: Iterator,
  indexA: number,
  indexB: number,
): LCSResult {
  function checkSequenceInDirection(
    _indexA: number,
    _indexB: number,
    stepFn: (n: number) => number,
  ): LCSResult {
    let bestSequence = 0;

    let candidateIndexA = _indexA;
    let candidateIndexB = _indexB;

    while (true) {
      const nextA = iterA.peek(_indexA);

      if (!nextA) {
        break;
      }

      const nextB = iterB.peek(_indexB);

      if (!nextB) {
        break;
      }

      if (!equals(nextA, nextB)) {
        break;
      }

      // Store indexes so that if the next iteration breaks early we don't end up with one step extra
      candidateIndexA = _indexA;
      candidateIndexB = _indexB;

      _indexA = stepFn(_indexA);
      _indexB = stepFn(_indexB);

      bestSequence++;
    }

    return {
      bestSequence,
      indexA: candidateIndexA,
      indexB: candidateIndexB,
    };
  }

  const backwardsPass = checkSequenceInDirection(indexA, indexB, (x) => x - 1);
  const forwardPass = checkSequenceInDirection(backwardsPass.indexA, backwardsPass.indexB, (x) => x + 1);

  return {
    indexA: backwardsPass.indexA,
    indexB: backwardsPass.indexB,
    bestSequence: forwardPass.bestSequence,
  };
}