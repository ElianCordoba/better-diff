import { describe, test } from "vitest";
import { getSimplifiedDiff } from "../../src";
import { validateDiff } from "../utils";

describe("Properly report lines removed", () => {
  test("Single line added bellow", () => {
    const a = `
      let name;
      let age;
    `;

    const b = `
      let name;
    `;

    const resultA = `
      let name;
      ➖let age;➖
    `;

    const resultB = `
      let name;
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Single line removed above", () => {
    const a = `
      let age;
      let name;
    `;

    const b = `
      let name;
    `;

    const resultA = `
      ➖let age;➖
      1🔀let name;⏹️
    `;

    const resultB = `
      1🔀let name;⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multiple lines removed 1", () => {
    const a = `
      let a;
      let b;
    `;

    const b = "";

    const resultA = `
      ➖let a;➖
      ➖let b;➖
    `;

    const resultB = b

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multiple lines added 2", () => {
    const a = `
      let a;
      let b;
      let c;
    `;

    const b = "";

    const resultA = `
      ➖let a;➖
      ➖let b;➖
      ➖let c;➖
    `;

    const resultB = b

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multiple lines added 3. With trivia", () => {
    const a = `let a;
      let b;
    `;

    const b = "";

    const resultA = `➖let a;➖
      ➖let b;➖
    `;

    const resultB = b;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
})