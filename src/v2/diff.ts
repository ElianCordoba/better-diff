import { _context } from ".";
import { assert, fail } from "../debug";
import { Iterator } from "./iterator";
import { oppositeSide, range, rangeEq } from "../utils";
import { Node } from "./node";
import { equals, getAllNodesFromMatch, getIndexesFromSegment, getIterFromSide, getTextLengthFromSegments } from "./utils";
import { Segment } from "./types";
import { CandidateMatch } from "./match";
import { Side } from "../shared/language";
import { DiffType } from "../types";

/**
 * Returns the longest possible match for the given node, this is including possible skips to improve the match length.
 */
export function getBestMatch(node: Node): CandidateMatch | undefined {
  // Since this function can be called with both A-sided and B-sided nodes, we need to get the iter dynamically
  // The iterator we need is the opposite of the given node since there is where we need to get the match from
  const sideToLook = oppositeSide(node.side);
  const iter = getIterFromSide(sideToLook);
  const otherSideCandidates = iter.getMatchingNodes(node);

  // The given node wasn't found, it was added
  if (otherSideCandidates.length === 0) {
    return;
  }

  let bestMatch = CandidateMatch.createEmpty();

  for (const candidate of otherSideCandidates) {
    const newCandidate = node.side === Side.a ? getCandidateMatch(node, candidate) : getCandidateMatch(candidate, node);

    if (newCandidate.isBetterThan(bestMatch)) {
      bestMatch = newCandidate;
    }
  }

  return bestMatch;
}

function getSubSequenceNodes(match: CandidateMatch, starterNode: Node) {
  const nodesInMatch = getAllNodesFromMatch(match);

  const allNodes = new Set<Node>();

  for (const node of nodesInMatch) {
    const similarNodes = _context.iterB.getMatchingNodes(node);

    for (const _node of similarNodes) {
      allNodes.add(_node);
    }
  }

  allNodes.delete(starterNode);

  return [...allNodes];
}

function getCandidateMatch(nodeA: Node, nodeB: Node): CandidateMatch {
  assert(nodeA.side === Side.a && nodeB.side === Side.b, () => "Wrong sided nodes");

  const MAX_NODE_SKIPS = _context.options.maxNodeSkips;

  const segments: Segment[] = [];
  const { iterA, iterB } = _context;

  let segmentLength = 0;
  let skips = 0;

  let currentASegmentStart = nodeA.index;
  let currentBSegmentStart = nodeB.index;

  let indexA = nodeA.index;
  let indexB = nodeB.index;

  assert(equals(nodeA, nodeB), () => "Misaligned matched");

  mainLoop: while (true) {
    // TODO-2 First iteration already has the nodes
    const nextA = iterA.peek(indexA);
    const nextB = iterB.peek(indexB);

    // If one of the iterators ends then there is no more search to do
    if (!nextA || !nextB) {
      assert(segmentLength > 0, () => "Segment length is 0");

      segments.push([
        currentASegmentStart,
        currentBSegmentStart,
        segmentLength,
      ]);
      break mainLoop;
    }

    if (equals(nextA, nextB)) {
      segmentLength++;
      indexA++;
      indexB++;
      continue;
    }

    assert(segmentLength > 0, () => "Segment length is 0");

    // We found a discrepancy. Before try to skip nodes to recover the match we record the current segment
    segments.push([currentASegmentStart, currentBSegmentStart, segmentLength]);
    segmentLength = 0;

    let skipsInLookaheadB = 0;

    // Verify the following n number of nodes ahead storing the ones equals to the wanted node
    //
    // A B C B C B B
    // 0 1 2 3 4 5 6
    //
    // Looking for node "B" at index 3 you will get back nodes at indexes 3 and 6
    function getSameNodesAhead(
      iter: Iterator,
      wantedNode: Node,
      lastIndex: number,
    ) {
      const nodes: Node[] = [];
      for (const index of rangeEq(wantedNode.index + 1, lastIndex)) {
        const next = iter.peek(index);

        if (!next) {
          continue;
        }

        if (equals(wantedNode, next)) {
          nodes.push(next);
        }
      }
      return nodes;
    }

    const skipBUntil = Math.min(iterB.nodes.length, indexB + MAX_NODE_SKIPS);

    for (const newIndexB of range(indexB, skipBUntil)) {
      const newB = iterB.peek(newIndexB);

      if (!newB) {
        break mainLoop;
      }

      let skipsInLookaheadA = 0;

      const skipAUntil = Math.min(iterA.nodes.length, indexA + MAX_NODE_SKIPS);
      lookaheadA: for (const newIndexA of range(indexA, skipAUntil)) {
        assert(newB);

        const newA = iterA.peek(newIndexA);

        if (!newA) {
          break lookaheadA;
        }

        if (equals(newA, newB)) {
          const sameNodesAheadA = getSameNodesAhead(iterA, newA, skipAUntil);
          const sameNodesAheadB = getSameNodesAhead(iterB, newB, skipBUntil);

          if (!sameNodesAheadA.length && !sameNodesAheadB.length) {
            indexA = newIndexA;
            indexB = newIndexB;

            currentASegmentStart = newIndexA;
            currentBSegmentStart = newIndexB;

            skips += skipsInLookaheadA + skipsInLookaheadB;
            continue mainLoop;
          }

          let bestCandidate = CandidateMatch.createEmpty();

          // TODO instead of getBestMatch use getCandidateMatch so that it skips node if necessary
          // TODO also getBestMatch has hardcoded B side

          for (const node of sameNodesAheadA) {
            const newCandidate = getBestMatch(node);

            if (!newCandidate) {
              fail();
            }

            if (newCandidate.isBetterThan(bestCandidate)) {
              // Give this input
              // A B C C D
              // 0 1 2 3 4
              //
              // Lets say we need to pick between one of the "C", picking the first one will mean no skip, picking the second one will imply one skip
              // 1: A B C
              // 2: A B _ C
              skipsInLookaheadA += node.index - newA.index;
              bestCandidate = newCandidate;
            }
          }

          for (const node of sameNodesAheadB) {
            const newCandidate = getBestMatch(node);

            if (!newCandidate) {
              fail();
            }

            if (newCandidate.isBetterThan(bestCandidate)) {
              skipsInLookaheadB += node.index - newB.index;
              bestCandidate = newCandidate;
            }
          }

          const { a, b } = getIndexesFromSegment(bestCandidate.segments[0]);

          indexA = a.start;
          indexB = b.start;

          currentASegmentStart = a.start;
          currentBSegmentStart = b.start;

          skips += skipsInLookaheadA + skipsInLookaheadB;

          continue mainLoop;
        }

        skipsInLookaheadA++;
      }

      skipsInLookaheadB++;
    }

    break mainLoop;
  }

  return new CandidateMatch(segments, getTextLengthFromSegments(segments), skips);
}

export function getBestMatchFromSubsequenceNodes(currentBestMatch: CandidateMatch, b: Node) {
  const { iterB, additions } = _context;

  // May be empty if the node we are looking for was the only one
  const subSequenceNodesToCheck = getSubSequenceNodes(currentBestMatch, b);

  let bestSubsequenceMatch = currentBestMatch;

  for (const node of subSequenceNodesToCheck) {
    const newCandidate = getBestMatch(node);

    if (!newCandidate) {
      additions.push(b.getSegment(DiffType.addition));
      iterB.mark(b.index, DiffType.addition);

      continue;
    }

    if (newCandidate.isBetterThan(bestSubsequenceMatch)) {
      bestSubsequenceMatch = newCandidate;
    }
  }

  return bestSubsequenceMatch;
}
