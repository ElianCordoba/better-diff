import { Context, getIndexesFromSegment } from "./utils";
import { Side } from "../shared/language";
import { Iterator } from "./iterator";
import { getBestMatch, getSubSequenceNodes, isLatterCandidateBetter, oneSidedIteration } from "./core";
import { Change } from "./diff";
import { DiffType } from "../types";
import { asciiRenderFn, fail, prettyRenderFn } from "../debug";
import { range } from "../utils";
import { Options, OutputType, ResultTypeMapper } from "./types";
import { applyChangesToSources } from "./printer";

const defaultOptions: Options = {
  outputType: OutputType.changes,
};

export function getDiff2<_OutputType extends OutputType = OutputType.changes>(sourceA: string, sourceB: string, options?: Options<_OutputType>): ResultTypeMapper[_OutputType] {
  const _options = { ...defaultOptions, ...(options || {}) };

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

  const changes: Change[] = [];

  _context = new Context(sourceA, sourceB, changes);

  _context.iterA = iterA;
  _context.iterB = iterB;

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

  switch (_options.outputType) {
    case OutputType.changes: {
      return changes as ResultTypeMapper[_OutputType];
    }
    case OutputType.text: {
      return applyChangesToSources(sourceA, sourceB, changes, asciiRenderFn) as ResultTypeMapper[_OutputType];
    }
    case OutputType.prettyText: {
      return applyChangesToSources(sourceA, sourceB, changes, prettyRenderFn) as ResultTypeMapper[_OutputType];
    }
    default:
      fail();
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
