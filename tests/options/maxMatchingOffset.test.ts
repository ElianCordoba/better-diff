import { describe, test } from "vitest";
import { getDiff } from "../../src";
import { validateDiff } from "../utils";

// @TODO: Maybe remove?
describe.skip("Properly report lines moved or added/deleted respecting the option 'maxMatchingOffset'", () => {
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
      🔀x⏹️
    `;

    const resultB = `
      ➕1➕
      ➕2➕
      ➕3➕
      🔀x⏹️
    `;

    const { sourceA, sourceB } = getDiff(a, b);

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

    const { sourceA, sourceB } = getDiff(a, b, { maxMatchingOffset: 3 });

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

    const { sourceA, sourceB } = getDiff(a, b, { maxMatchingOffset: 3 });

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
});
