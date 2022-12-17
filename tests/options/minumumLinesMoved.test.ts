import { describe, test } from "vitest";
import { getTextWithDiffs } from "../../src";
import { validateDiff } from "../utils";

describe("Properly report lines moved respecting the option 'minimumLinesMoved'", () => {
  test("Inline move with 'minimumLinesMoved' set to 0 (Default value)", () => {
    const a = `
      x
    `;

    const b = `
      a x
    `;

    const resultA = `
      1🔀x⏹️
    `;

    const resultB = `
      ➕a➕ 1🔀x⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Inline move with 'minimumLinesMoved' set to 1", () => {
    const a = `
      x
    `;

    const b = `
      a x
    `;

    const resultA = `
      x
    `;

    const resultB = `
      ➕a➕ x
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b, { minimumLinesMoved: 1 }).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Bigger move with 'minimumLinesMoved' set to 0 (Default value)", () => {
    const a = `
      x
    `;

    const b = `
      a
      x
    `;

    const resultA = `
      1🔀x⏹️
    `;

    const resultB = `
      ➕a➕
      1🔀x⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Bigger move with 'minimumLinesMoved' set to 1", () => {
    const a = `
      x
    `;

    const b = `
      a
      x
    `;

    const resultA = `
      1🔀x⏹️
    `;

    const resultB = `
      ➕a➕
      1🔀x⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b, { minimumLinesMoved: 1 }).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Bigger move with 'minimumLinesMoved' set to 2", () => {
    const a = `
      x
    `;

    const b = `
      a
      x
    `;

    const resultA = `
      x
    `;

    const resultB = `
      ➕a➕
      x
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b, { minimumLinesMoved: 2 }).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
});
