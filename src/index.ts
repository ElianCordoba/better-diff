import { Change } from "./change";
import { getInitialDiffs } from "./main";
import { applyChangesToSources, asciiRenderFn, DiffRendererFn } from "./reporter";
import { DiffResult } from "./types";

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
}

const defaultOptions: Options = {
  renderFn: asciiRenderFn,
  minimumLinesMoved: 0,
};

export function getTextWithDiffs(
  sourceA: string,
  sourceB: string,
  options?: Options,
): { diffs: DiffResult; changes: Change[] } {
  const _options = { ...defaultOptions, ...(options || {}) } as Required<Options>;

  const changes = getInitialDiffs(sourceA, sourceB, _options);
  const sourcesWithDiff = applyChangesToSources(
    sourceA,
    sourceB,
    changes,
    _options.renderFn,
  );

  return { diffs: sourcesWithDiff, changes: changes };
}
