import { Context } from "./utils";
import { Side } from "../shared/language";
import { Iterator } from "./iterator";
import { computeDiff } from "./core";
import { asciiRenderFn, fail, prettyRenderFn } from "../debug";
import { Options, OutputType, ResultTypeMapper } from "./types";
import { applyChangesToSources } from "./printer";
import { Change } from "./change";

const defaultOptions: Required<Options> = {
  outputType: OutputType.changes,
  tryAlignMoves: true,
};

export function getDiff2<_OutputType extends OutputType = OutputType.changes>(sourceA: string, sourceB: string, options?: Options<_OutputType>): ResultTypeMapper[_OutputType] {
  const _options = { ...defaultOptions, ...(options || {}) };

  const iterA = new Iterator(sourceA, Side.a);
  const iterB = new Iterator(sourceB, Side.b);

  let changes: Change[] = [];

  _context = new Context(sourceA, sourceB, iterA, iterB, changes);

  changes = computeDiff();

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

export let _context: Context;
