import { Context } from "./utils";
import { Side } from "../shared/language";
import { Iterator } from "./iterator";
import { computeDiff } from "./core";
import { fail } from "../debug";
import { Options, OutputType, ResultTypeMapper, Segment } from "./types";
import { applyChangesToSources } from "./printer";
import { Change, Move } from "./change";
import { computeMoveAlignment } from "./semanticAligment";
import { compactAndCreateDiff } from "./compact";
import { DiffType } from "../types";

export function getDiff2<_OutputType extends OutputType = OutputType.changes>(sourceA: string, sourceB: string, options?: Options<_OutputType>): ResultTypeMapper[_OutputType] {
  const iterA = new Iterator(sourceA, Side.a);
  const iterB = new Iterator(sourceB, Side.b);

  let moves: Move[] = [];

  const deletions: Segment[] = [];
  const additions: Segment[] = [];

  _context = new Context(options, sourceA, sourceB, iterA, iterB, moves, deletions, additions);

  const _options = _context.options;

  moves = computeDiff();

  if (_options.tryAlignMoves) {
    moves = computeMoveAlignment(moves);
  }

  // We compact all tracked additions and deletions into a single change with multiple segments, we also compact them if possible

  const changes: Change[] = moves;
  if (_context.additions.length) {
    const additionsChange = compactAndCreateDiff(DiffType.addition, additions);
    changes.push(additionsChange);
  }

  if (_context.deletions.length) {
    const deletionsChange = compactAndCreateDiff(DiffType.deletion, deletions);
    changes.push(deletionsChange);
  }

  switch (_options.outputType) {
    case OutputType.changes: {
      return changes as ResultTypeMapper[_OutputType];
    }
    case OutputType.text: {
      return applyChangesToSources(sourceA, sourceB, changes, false) as ResultTypeMapper[_OutputType];
    }
    case OutputType.prettyText: {
      return applyChangesToSources(sourceA, sourceB, changes, true) as ResultTypeMapper[_OutputType];
    }
    default:
      fail("Unknown output type");
  }
}

export let _context: Context;
