import { Context, getIndexesFromSegment } from "./utils";
import { Side } from "../shared/language";
import { Iterator } from "./iterator";
import { getBestMatch, getSubSequenceNodes, oneSidedIteration } from "./core";
import { Change, Segment } from "./diff";
import { DiffType } from "../types";
import { fail } from "../debug";
import { range } from "../utils";
import { Diff } from "../data_structures/diff";

export function getDiff2(sourceA: string, sourceB: string) {
  const iterA = new Iterator(sourceA, Side.a);
  const iterB = new Iterator(sourceB, Side.b);

  // console.log('------------- A ----------')
  // iterA.nodes.map((x, i) => {
  //   console.log(i, "|", x.start, x.end, x.prettyKind, `"${x.text}"`)
  // })

  // console.log('------------- B ----------')
  // iterB.nodes.map((x, i) => {
  //   console.log(i, "|", x.start, x.end, x.prettyKind, `"${x.text}"`)
  // })

  _context = new Context(sourceA, sourceB);

  _context.iterA = iterA;
  _context.iterB = iterB;

  const changes: Change[] = [];

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
      const startFrom = !a ? b?.index : a.index;

      const remainingChanges = oneSidedIteration(iterOn, type, startFrom!);
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

    const subSequenceNodesToCheck = getSubSequenceNodes(bestMatchForB, b);

    if (!subSequenceNodesToCheck.length) {
      fail("IDK");
    }

    let bestCandidate = bestMatchForB;

    for (const node of subSequenceNodesToCheck) {
      const _bestMatch = getBestMatch(node);

      if (!_bestMatch) {
        const addition = Change.createAddition(b);
        changes.push(addition);
        iterB.mark(b.index, DiffType.addition);

        continue;
      }

      if (_bestMatch.length > bestCandidate.length) {
        bestCandidate = _bestMatch;
      }
    }

    const move = Change.createMove(bestCandidate);
    changes.push(move);
    markMatched(move);
    continue;
  }
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

export let _context: Context;
