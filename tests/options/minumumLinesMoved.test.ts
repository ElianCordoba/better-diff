import { describe, test } from "vitest";
import { getDiff } from "../../src";
import { validateDiff } from "../utils";

// TODO: Remove this
describe.skip("Properly report lines moved respecting the option 'minimumLinesMoved'", () => {
  test("Inline move with 'minimumLinesMoved' set to 0 (Default value)", () => {
    const a = `
      x
    `;

    const b = `
      a x
    `;

    const resultA = `
      🔀x⏹️
    `;

    const resultB = `
      ➕a➕ 🔀x⏹️
    `;

    const { sourceA, sourceB } = getDiff(a, b);

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

    const { sourceA, sourceB } = getDiff(a, b, { minimumLinesMoved: 1 });

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
      🔀x⏹️
    `;

    const resultB = `
      ➕a➕
      🔀x⏹️
    `;

    const { sourceA, sourceB } = getDiff(a, b);

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
      🔀x⏹️
    `;

    const resultB = `
      ➕a➕
      🔀x⏹️
    `;

    const { sourceA, sourceB } = getDiff(a, b, { minimumLinesMoved: 1 });

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

    const { sourceA, sourceB } = getDiff(a, b, { minimumLinesMoved: 2 });

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Bigger move with 'minimumLinesMoved' set to 2, inversed", () => {
    const a = `
      x
    `;

    const b = `
      x

      a
    `;

    const resultA = `
      x
    `;

    const resultB = `
      x

      ➕a➕
    `;

    const { sourceA, sourceB } = getDiff(a, b, { minimumLinesMoved: 3 });

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
});
