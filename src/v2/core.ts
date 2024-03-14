import { _context } from ".";
import { getBestMatch, getSubSequenceNodes } from "./diff";
import { getIndexesFromSegment, isLatterCandidateBetter } from "./utils";
import { Iterator } from "./iterator";
import { DiffType } from "../types";
import { Change } from "./change";
import { range } from "../utils";

export function computeDiff() {
  const { iterA, iterB, changes } = _context;

  while (true) {
    const a = iterA.next();
    const b = iterB.next();

    // No more nodes to process. We are done
    if (!a && !b) {
      break;
    }

    // One of the iterators ran out of nodes. We will mark the remaining unmatched nodes
    if (!a || !b) {
      // If A finished means that B still have nodes, they are additions. If B finished means that A have nodes, they are deletions
      const iterOn = !a ? iterB : iterA;
      const type = !a ? DiffType.addition : DiffType.deletion;

      const remainingChanges = oneSidedIteration(iterOn, type);
      changes.push(...remainingChanges);
      break;
    }

    // 1-
    const bestMatchForB = getBestMatch(b);

    if (!bestMatchForB) {
      const addition = Change.createAddition(b);
      changes.push(addition);
      iterB.mark(b.index, DiffType.addition);

      continue;
    }

    // May be empty if the node we are looking for was the only one
    const subSequenceNodesToCheck = getSubSequenceNodes(bestMatchForB, b);

    let bestCandidate = bestMatchForB;

    for (const node of subSequenceNodesToCheck) {
      const newCandidate = getBestMatch(node);

      if (!newCandidate) {
        const addition = Change.createAddition(b);
        changes.push(addition);
        iterB.mark(b.index, DiffType.addition);

        continue;
      }

      if (isLatterCandidateBetter(bestCandidate, newCandidate)) {
        bestCandidate = newCandidate;
      }
    }

    const move = Change.createMove(bestCandidate);
    changes.push(move);
    markMatched(move);
    continue;
  }

  return changes;
}

function markMatched(change: Change) {
  for (const segment of change.segments) {
    const { a, b } = getIndexesFromSegment(segment);

    for (const index of range(a.start, a.end)) {
      _context.iterA.mark(index, change.type);
    }

    for (const index of range(b.start, b.end)) {
      _context.iterB.mark(index, change.type);
    }
  }
}

export function oneSidedIteration(
  iter: Iterator,
  typeOfChange: DiffType.addition | DiffType.deletion,
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
