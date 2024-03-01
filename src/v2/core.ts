import { _context } from ".";
import { SyntaxKind } from "./types";
import { Node } from "./node";
import { CandidateMatch, Change, getCandidateMatch } from "./diff";
import { getAllNodesFromMatch } from "./utils";
import { fail } from "../debug";
import { Iterator } from "./iterator";
import { DiffType } from "../types";

/**
 * Returns the longest possible match for the given node, this is including possible skips to improve the match length.
 */
export function getBestMatch(nodeB: Node): CandidateMatch | undefined {
  const aSideCandidates = _context.iterA.getMatchingNodes(nodeB);

  // The given B node wasn't found, it was added
  if (aSideCandidates.length === 0) {
    return;
  }

  let bestMatch: CandidateMatch = {
    length: 0,
    skips: 0,
    segments: [],
  };

  for (const candidate of aSideCandidates) {
    const newCandidate = getCandidateMatch(candidate, nodeB);

    if (isNewCandidateBetter(bestMatch, newCandidate)) {
      bestMatch = newCandidate;
    }
  }

  return bestMatch;
}

export function getSubSequenceNodes(match: CandidateMatch, starterNode: Node) {
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

export function oneSidedIteration(
  iter: Iterator,
  typeOfChange: DiffType.addition | DiffType.deletion,
  startFrom: number,
): Change[] {
  const changes: Change[] = [];

  let node = iter.next();

  // TODO: Compactar?
  while (node) {
    let change: Change;

    if (typeOfChange === DiffType.addition) {
      change = Change.createAddition(node);
    } else {
      change = Change.createDeletion(node);
    }

    changes.push(change);
    iter.mark(node.index, typeOfChange);
    node = iter.next(node.index + 1);
  }

  return changes;
}

/**
 * TODO: MAybe compute a score fn
 */
export function isNewCandidateBetter(currentCandidate: CandidateMatch, newCandidate: CandidateMatch): boolean {
  if (newCandidate.length > currentCandidate.length) {
    return true;
  } else if (newCandidate.length < currentCandidate.length) {
    return false;
  }

  if (newCandidate.segments.length > currentCandidate.segments.length) {
    return false;
  } else if (newCandidate.segments.length < currentCandidate.segments.length) {
    return false;
  }

  return newCandidate.skips < currentCandidate.skips;
}
