import { _context } from ".";
import { getBestMatch, getSubSequenceNodes } from "./diff";
import { getIndexesFromSegment, isLatterCandidateBetter } from "./utils";
import { Iterator } from "./iterator";
import { DiffType } from "../types";
import { Change } from "./change";
import { range } from "../utils";

export function computeDiff() {
  const { iterA, iterB, changes, additions } = _context;

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

      oneSidedIteration(iterOn, type);
      break;
    }

    // 1-
    const bestMatchForB = getBestMatch(b);

    if (!bestMatchForB) {
      additions.push(b.getSegment(DiffType.addition));
      iterB.mark(b.index, DiffType.addition);

      continue;
    }

    // May be empty if the node we are looking for was the only one
    const subSequenceNodesToCheck = getSubSequenceNodes(bestMatchForB, b);

    let bestCandidate = bestMatchForB;

    for (const node of subSequenceNodesToCheck) {
      const newCandidate = getBestMatch(node);

      if (!newCandidate) {
        additions.push(b.getSegment(DiffType.addition));
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
) {
  const { additions, deletions } = _context;

  let node = iter.next();
  while (node) {
    if (typeOfChange === DiffType.addition) {
      additions.push(node.getSegment(DiffType.addition));
    } else {
      deletions.push(node.getSegment(DiffType.deletion));
    }

    iter.mark(node.index, typeOfChange);
    node = iter.next(node.index + 1);
  }
}
