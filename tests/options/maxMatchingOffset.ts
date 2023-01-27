import { describe, test } from "vitest";
import { getTextWithDiffs } from "../../src";
import { validateDiff } from "../utils";

describe("Properly report lines moved or added/deleted respecting the option 'maxMatchingOffset'", () => {
  test("Default value, should find the move", () => {
    const a = `
      x
    `;

    const b = `
      1
      2
      3
      x
    `;

    const resultA = `
      1🔀x⏹️
    `;

    const resultB = `
      ➕1➕
      ➕2➕
      ➕3➕
      1🔀x⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Reduced value, should bail out of the matching and report addition/removal", () => {
    const a = `
      x
    `;

    const b = `
      1
      2
      3
      x
    `;

    const resultA = `
      ➖x➖
    `;

    const resultB = `
      ➕1➕
      ➕2➕
      ➕3➕
      ➕x➕
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b, { maxMatchingOffset: 3 }).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Reduced value, should bail out of the matching and report addition/removal, inverted", () => {
    const a = `
      1
      2
      3
      x
    `;

    const b = `
      x
    `;

    const resultA = `
      ➖1➖
      ➖2➖
      ➖3➖
      ➖x➖
    `;

    const resultB = `
      ➕x➕
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b, { maxMatchingOffset: 3 }).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
});
