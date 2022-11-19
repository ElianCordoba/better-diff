import { getInitialDiffs } from "./main";
import { applyChangesToSources } from "./reporter";

export function getTextWithDiff(sourceA: string, sourceB: string): { sourceA: string; sourceB: string } {
  const diffs = getInitialDiffs(sourceA, sourceB)
  const codeWithChanges = applyChangesToSources(sourceA, sourceB, diffs)

  return codeWithChanges
}