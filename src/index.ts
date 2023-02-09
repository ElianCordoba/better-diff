import { getChanges } from "./main";
import { applyChangesToSources, asciiRenderFn, DiffRendererFn, getAlignedSources } from "./reporter";
import { serialize } from "./serializer";
import { ChangeType, SerializedResponse, Side } from "./types";
import { Node } from "./node";
import { AlignmentTable } from "./alignmentTable";
import { DebugFailure } from "./debug";

// These options have their own tests under the /tests/options folder
export interface Options {
  outputType?: OutputType;

  warnOnInvalidCode?: boolean;

  renderFn?: DiffRendererFn;

  // Indicates how many nodes are we going to check while trying to find a match. Note that this is number is doubled since we look both backwards and forwards
  // For example:
  //
  // x
  //
  // ---------------
  //
  // 1
  // 2
  // 3
  // x
  //
  // There are 3 node of distances between the two "x", if "maxMatchingOffset" is set to less than 3 the move won't be found and it will be reported as an addition/removal.
  // This is present so that we have acceptable performance on long files where many nodes are present
  maxMatchingOffset?: number;

  alignmentText?: string;
  includeDebugAlignmentInfo?: boolean;
}

export enum OutputType {
  serializedChunks = "serializedChunks",
  serializedAlignedChunks = "serializedAlignedChunks",
  text = "text",
  alignedText = "alignedText",
}

interface ResultTypeMapper {
  [OutputType.serializedChunks]: SerializedResponse;
  [OutputType.serializedAlignedChunks]: SerializedResponse;
  [OutputType.text]: { sourceA: string; sourceB: string };
  [OutputType.alignedText]: { sourceA: string; sourceB: string };
}

export function getDiff<_OutputType extends OutputType = OutputType.text>(
  sourceA: string,
  sourceB: string,
  options?: Options,
): ResultTypeMapper[_OutputType] {
  // Set up globals
  _options = { ...defaultOptions, ...(options || {}) } as Required<Options>;
  _context = { sourceA, sourceB, alignmentTable: new AlignmentTable(), alignmentsOfMoves: [] };

  const changes = getChanges(sourceA, sourceB);

  switch (_options.outputType) {
    case OutputType.serializedChunks: {
      // deno-lint-ignore no-explicit-any
      return serialize(sourceA, sourceB, changes) as any;
    }

    case OutputType.serializedAlignedChunks: {
      const alignedSources = getAlignedSources(sourceA, sourceB);
      // deno-lint-ignore no-explicit-any
      return serialize(alignedSources.sourceA, alignedSources.sourceB, changes) as any;
    }

    case OutputType.text: {
      // deno-lint-ignore no-explicit-any
      return applyChangesToSources(sourceA, sourceB, changes) as any;
    }

    case OutputType.alignedText: {
      // deno-lint-ignore no-explicit-any
      return getAlignedSources(sourceA, sourceB) as any;
    }

    default: {
      throw new DebugFailure(`Unknown output type "${_options.outputType}"`);
    }
  }
}

const defaultOptions: Options = {
  outputType: OutputType.text,
  warnOnInvalidCode: false,
  renderFn: asciiRenderFn,
  // TODO: Look for a good value
  maxMatchingOffset: 200,
  alignmentText: "\n",
  includeDebugAlignmentInfo: false,
};

let _options: Required<Options>;
export function getOptions(): Required<Options> {
  return _options;
}

export interface LayoutShift {
  producedBy: ChangeType;
  a: Map<number, number>;
  b: Map<number, number>;
  lcs: number;
  nodeA: Node;
  nodeB: Node;
}

export class LayoutShiftCandidate {
  constructor(
    // Key: Number on lines to insert on each side
    // Value: Length of the string
    public a = new Map<number, number>(),
    public b = new Map<number, number>(),
  ) {}

  add(side: Side, at: number, length: number) {
    if (side === Side.a) {
      if (this.a.has(at)) {
        const currentValue = this.a.get(at)!;

        this.a.set(at, currentValue + length);
      } else {
        this.a.set(at, length);
      }
    } else {
      if (this.b.has(at)) {
        const currentValue = this.b.get(at)!;

        this.b.set(at, currentValue + length);
      } else {
        this.b.set(at, length);
      }
    }
  }

  getLcs(side: Side) {
    const _side = side === Side.a ? this.a : this.b;

    let tot = 0;
    _side.forEach((x) => tot += x);

    return tot;
  }

  getShift(type: ChangeType, a: Node, b: Node): LayoutShift {
    return {
      producedBy: type,
      a: this.a,
      b: this.b,
      lcs: this.getLcs(Side.a) + this.getLcs(Side.b),
      nodeA: a,
      nodeB: b,
    };
  }

  isEmpty() {
    return this.a.size === 0 && this.b.size === 0;
  }
}

export interface MoveAlignmentInfo {
  startA: number;
  startB: number;
  endA: number;
  endB: number;
  text: string;
}

interface Context {
  sourceA: string;
  sourceB: string;
  alignmentTable: AlignmentTable;
  alignmentsOfMoves: MoveAlignmentInfo[];
}

let _context: Context;
export function getContext() {
  return _context;
}
