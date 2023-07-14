import { computeDiff } from "./core/main";
import { applyAlignments, applyChangesToSources } from "./backend/printer";
import { SerializedResponse, serialize } from "./backend/serializer";
import { Mode } from "./types";
import { fail, prettyRenderFn } from "./debug";
import { Context } from "./context";
import { getParsedProgram } from "./frontend/typescript";
import { Side } from "./shared/language";

// These options have their own tests under the /tests/options folder
export interface Options {
  mode?: Mode;

  outputType?: OutputType;

  warnOnInvalidCode?: boolean;

  // For testing and debugging mostly
  alignmentText?: string;

  // If enable, the emojis / text coloring will be ignored. Useful when testing alignments
  ignoreChangeMarkers?: boolean;
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

  const programA = getParsedProgram(Side.a, sourceA)
  const programB = getParsedProgram(Side.b, sourceB)

  const diff = computeDiff(programA, programB);

  switch (_options.outputType) {
    case OutputType.serializedChunks: {
      return serialize(sourceA, sourceB, diff) as ResultTypeMapper[_OutputType];
    }

    case OutputType.serializedAlignedChunks: {
      const alignedResult = applyAlignments(sourceA, sourceB, diff);
      return serialize(alignedResult.sourceA, alignedResult.sourceB, alignedResult.changes) as ResultTypeMapper[_OutputType];
    }

    case OutputType.text: {
      return applyChangesToSources(sourceA, sourceB, diff) as ResultTypeMapper[_OutputType];
    }

    case OutputType.prettyText: {
      return applyChangesToSources(sourceA, sourceB, diff, prettyRenderFn) as ResultTypeMapper[_OutputType];
    }

    case OutputType.alignedText: {
      const { changes, ...alignedResult } = applyAlignments(sourceA, sourceB, diff);

      if (options?.ignoreChangeMarkers) {
        return alignedResult as ResultTypeMapper[_OutputType]
      }
      return applyChangesToSources(alignedResult.sourceA, alignedResult.sourceB, changes) as ResultTypeMapper[_OutputType];
    }

    // Used mainly for benchmarking the core algorithm on it's own. Without this the total execution time of the `getDiff`
    // function will include the time it takes to do the reporting, which can be quite a lot
    case OutputType.noop: {
      return undefined as ResultTypeMapper[_OutputType];
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
  alignmentText: "",
  ignoreChangeMarkers: false
};

export let _options: Required<Options>;
export let _context: Context;
