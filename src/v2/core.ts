import { _context } from ".";
import { SyntaxKind } from "./types";
import { Node } from "./node";
import { CandidateMatch, Change, findSegmentLength, Segment } from "./diff";
import { getAllNodesFromMatch } from "./utils";
import { fail } from "../debug";
import { Iterator } from "./iterator";
import { DiffType } from "../types";

/**
 * Returns the longest possible match for the given node, this is including possible skips to improve the match length.
 */
export function getBestMatch(nodeB: Node): CandidateMatch | undefined {
  const aSideCandidates = _context.iterA.getMatchingNodes(nodeB);

  if (aSideCandidates.length === 0) {
    fail("WTF2");
  }

  let bestMatch: CandidateMatch = {
    length: 0,
    skips: 0,
    segments: [],
  };

  for (const candidate of aSideCandidates) {
    const currentMatch = findSegmentLength(candidate, nodeB);

    if (currentMatch.length > bestMatch.length) {
      bestMatch = currentMatch;
    }
  }

  return bestMatch;
}

export function getSubSequenceNodes(match: CandidateMatch, starterNode: Node) {
  const nodesInMatch = getAllNodesFromMatch(match);

  const kinds = new Set<SyntaxKind>();

  for (const node of nodesInMatch) {
    kinds.add(node.kind);
  }

  const allNodes: Node[] = [];
  for (const kind of kinds) {
    const nodesOfKind = _context.iterB.nodesTable.get(kind);

    if (!nodesOfKind) {
      fail();
    }
    allNodes.push(...nodesOfKind);
  }

  const indexOfStartNode = allNodes.findIndex((x) => x.index === starterNode.index);
  allNodes.splice(indexOfStartNode, 1);

  return allNodes;
}

export function oneSidedIteration(
  iter: Iterator,
  typeOfChange: DiffType.addition | DiffType.deletion,
  startFrom: number,
): Change[] {
  const changes: Change[] = [];

  let node = iter.next(startFrom);

  // TODO: Compactar?
  while (node) {
    let change: Change;

    if (typeOfChange === DiffType.addition) {
      change = Change.createAddition(node);
    } else {
      change = Change.createDeletion(node);
    }

    iter.mark(node.index, typeOfChange);
    node = iter.next(node.index + 1);
  }

  return changes;
}
