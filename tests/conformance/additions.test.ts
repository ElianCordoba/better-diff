import { describe, test } from "vitest";
import { getTextWithDiffs } from "../../src";
import { validateDiff } from "../utils";

describe("Properly report lines added", () => {
  test("Single line added bellow", () => {
    const a = `
      let name;
    `;

    const b = `
      let name;
      let age;
    `;

    const resultA = `
      let name;
    `;

    const resultB = `
      let name;
      ➕let➕ ➕age;➕
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Single line added above", () => {
    const a = `
      let name;
    `;

    const b = `
      let age;
      let name;
    `;

    const resultA = `
      1🔀let name;⏹️
    `;

    const resultB = `
      ➕let➕ ➕age;➕
      1🔀let name;⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multiple lines added 1", () => {
    const a = "";

    const b = `
      let a;
      let b;
    `;

    const resultA = a;

    const resultB = `
      ➕let➕ ➕a;➕
      ➕let➕ ➕b;➕
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multiple lines added 2", () => {
    const a = "";

    const b = `
      let a;
      let b;
      let c;
    `;

    const resultA = a;

    const resultB = `
      ➕let➕ ➕a;➕
      ➕let➕ ➕b;➕
      ➕let➕ ➕c;➕
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multiple lines added 3. With trivia", () => {
    const a = "";

    const b = `let a;
      let b;
    `;

    const resultA = a;

    const resultB = `➕let➕ ➕a;➕
      ➕let➕ ➕b;➕
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Added wrapped code", () => {
    const a = `
      callFn()
    `;

    const b = `
      while (true) {
        callFn()
      }
    `;

    const resultA = `
      1🔀callFn()⏹️
    `;

    const resultB = `
      ➕while➕ ➕(true)➕ ➕{➕
        1🔀callFn()⏹️
      ➕}➕
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
});
