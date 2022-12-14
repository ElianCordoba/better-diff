import { Change } from "./change";
import { getInitialDiffs } from "./main";
import { applyChangesToSources, asciiRenderFn, DiffRendererFn } from "./reporter";
import { DiffResult } from "./types";

export function getTextWithDiffs(
  sourceA: string,
  sourceB: string,
  renderFn: DiffRendererFn = asciiRenderFn,
): { diffs: DiffResult; changes: Change[] } {
  const changes = getInitialDiffs(sourceA, sourceB);
  const sourcesWithDiff = applyChangesToSources(
    sourceA,
    sourceB,
    changes,
    renderFn,
  );

  return { diffs: sourcesWithDiff, changes: changes };
}
