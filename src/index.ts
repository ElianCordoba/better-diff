import { AlignmentTable } from "./alignmentTable";
import { Change } from "./change";
import { getInitialDiffs } from "./main";
import { applyChangesToSources, asciiRenderFn, DiffRendererFn } from "./reporter";
import { DiffResult } from "./types";

// These options have their own tests under the /tests/options folder
export interface Options {
  renderFn?: DiffRendererFn;

  // Number of lines that code needs to move (either above or bellow) from original location in order to consider the change a move, otherwise it will be ignored.
  // This is used so that a single character move won't trigger a move, for example:
  //
  // console.log(0)
  //
  // -----------------
  //
  // ; console.log(0)
  //
  // In this case the whole "console.log(0)" would be consider a move because the exact positions don't match
  minimumLinesMoved?: number;

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
}

export function getTextWithDiffs(
  sourceA: string,
  sourceB: string,
  options?: Options,
): { diffs: DiffResult; changes: Change[]; alignmentTable: AlignmentTable } {
  _options = { ...defaultOptions, ...(options || {}) } as Required<Options>;

  const { changes, alignmentTable } = getInitialDiffs(sourceA, sourceB);
  const sourcesWithDiff = applyChangesToSources(
    sourceA,
    sourceB,
    changes,
    _options.renderFn,
  );

  return { diffs: sourcesWithDiff, changes: changes, alignmentTable };
}

const defaultOptions: Options = {
  renderFn: asciiRenderFn,
  minimumLinesMoved: 0,
  // TODO: Look for a good value
  maxMatchingOffset: 200,
};

let _options: Required<Options>;
export function getOptions(): Required<Options> {
  return _options;
}
