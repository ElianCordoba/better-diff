import { describe, test } from "vitest";
import { getSimplifiedDiff } from "../../src";
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

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

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

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multiple lines added 1", () => {
    const a = "";

    const b = `
      let a;
      let b;
    `;

    const resultA = a

    const resultB = `
      ➕let➕ ➕a;➕
      ➕let➕ ➕b;➕
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multiple lines added 2", () => {
    const a = "";

    const b = `
      let a;
      let b;
      let c;
    `;

    const resultA = a

    const resultB = `
      ➕let➕ ➕a;➕
      ➕let➕ ➕b;➕
      ➕let➕ ➕c;➕
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

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

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
})

