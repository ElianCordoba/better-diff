import { _context } from ".";
import { getBestMatch, getBestMatchFromSubsequenceNodes } from "./diff";
import { getIndexesFromSegment, sort } from "./utils";
import { Iterator } from "./iterator";
import { DiffType } from "../types";
import { Change } from "./change";
import { range } from "../utils";

export function computeDiff() {
  const { iterA, iterB, moves, additions } = _context;

  while (true) {
    const a = iterA.next();
    const b = iterB.next();

    if (!a && !b) {
      break;
    }

    if (!a || !b) {
      // If A finished means that B still have nodes, report them as additions
      // If B finished means that A still have nodes, report them as deletions
      const iterOn = !a ? iterB : iterA;
      const type = !a ? DiffType.addition : DiffType.deletion;

      oneSidedIteration(iterOn, type);
      break;
    }

    // 1- Get the best match for the current node
    let bestMatchForB = getBestMatch(b);

    if (!bestMatchForB) {
      additions.push(b.getSegment(DiffType.addition));
      iterB.mark(b.index, DiffType.addition);

      continue;
    }

    // 2- Get all possible matches from subsequence nodes and compare it with the original match found. Pick the best
    bestMatchForB = getBestMatchFromSubsequenceNodes(bestMatchForB, b);

    // 3- Store the match, mark nodes and continue
    const move = Change.createMove(bestMatchForB);
    moves.push(move);
    markMatched(move);
    continue;
  }

  return moves.sort((a, b) => sort.desc(a.textLength, b.textLength));
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
