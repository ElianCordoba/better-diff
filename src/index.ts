import { getInitialDiffs } from "./main";
import { applyChangesToSources, simplifiedDrawingFunctions } from "./reporter";
import { DiffResult } from "./types";

export function getDiff(sourceA: string, sourceB: string): DiffResult {
  const diffs = getInitialDiffs(sourceA, sourceB)
  const sourcesWithDiff = applyChangesToSources(sourceA, sourceB, diffs)

  return sourcesWithDiff
}

export function getSimplifiedDiff(sourceA: string, sourceB: string): DiffResult {
  const diffs = getInitialDiffs(sourceA, sourceB)
  const sourcesWithDiff = applyChangesToSources(sourceA, sourceB, diffs, simplifiedDrawingFunctions)

  return sourcesWithDiff
}