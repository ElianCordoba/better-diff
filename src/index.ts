import { getChanges } from "./main";
import { applyAlignments, applyChangesToSources, prettyRenderFn } from "./reporter";
import { serialize } from "./serializer";
import { ChangeType, Mode, SerializedResponse, Side } from "./types";
import { Node } from "./node";
import { fail } from "./debug";
import { Context } from "./context";

// These options have their own tests under the /tests/options folder
export interface Options {
  mode?: Mode;

  outputType?: OutputType;

  warnOnInvalidCode?: boolean;

  // For testing and debugging mostly
  alignmentText?: string;
}

export enum OutputType {
  serializedChunks,
  serializedAlignedChunks,
  text,
  prettyText,
  alignedText,
  noop,
}

interface ResultTypeMapper {
  [OutputType.serializedChunks]: SerializedResponse;
  [OutputType.serializedAlignedChunks]: SerializedResponse;
  [OutputType.text]: { sourceA: string; sourceB: string };
  [OutputType.prettyText]: { sourceA: string; sourceB: string };
  [OutputType.alignedText]: { sourceA: string; sourceB: string };
  [OutputType.noop]: void;
}

export function getDiff<_OutputType extends OutputType = OutputType.text>(
  sourceA: string,
  sourceB: string,
  options?: Options,
): ResultTypeMapper[_OutputType] {
  // Set up globals
  _options = { ...defaultOptions, ...(options || {}) } as Required<Options>;

  _context = new Context(sourceA, sourceB);

  const changes = getChanges(sourceA, sourceB);

  switch (_options.outputType) {
    case OutputType.serializedChunks: {
      // deno-lint-ignore no-explicit-any
      return serialize(sourceA, sourceB, changes) as any;
    }

    case OutputType.serializedAlignedChunks: {
      const alignedResult = applyAlignments(sourceA, sourceB, changes, _context.offsetTracker)
      // deno-lint-ignore no-explicit-any
      return serialize(alignedResult.sourceA, alignedResult.sourceB, alignedResult.changes) as any;
    }

    case OutputType.text: {
      // deno-lint-ignore no-explicit-any
      return applyChangesToSources(sourceA, sourceB, changes) as any;
    }

    case OutputType.prettyText: {
      // deno-lint-ignore no-explicit-any
      return applyChangesToSources(sourceA, sourceB, changes, prettyRenderFn) as any;
    }

    case OutputType.alignedText: {
      const alignedResult = applyAlignments(sourceA, sourceB, changes, _context.offsetTracker)
      // deno-lint-ignore no-explicit-any
      return applyChangesToSources(alignedResult.sourceA, alignedResult.sourceB, alignedResult.changes) as any;
    }

    // Used mainly for benchmarking the core algorithm on it's own. Without this the total execution time of the `getDiff`
    // function will include the time it takes to do the reporting, which can be quite a lot
    case OutputType.noop: {
      // deno-lint-ignore no-explicit-any
      return undefined as any;
    }

    default: {
      const assert: never = _options.outputType;
      fail(`Unknown output type "${assert}"`);
    }
  }
}

const defaultOptions: Options = {
  mode: Mode.debug,
  outputType: OutputType.text,
  warnOnInvalidCode: false,
  alignmentText: "\n",
};

let _options: Required<Options>;
export function getOptions(): Required<Options> {
  return _options || {};
}

export let _context: Context;
