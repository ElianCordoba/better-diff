import { describe, test } from "vitest";
import { getSimplifiedDiff } from "../../src";
import { validateDiff } from "../utils";

describe("Properly report lines added", () => {
  test("Simple move", () => {
    const a = `
      a
      b
    `;

    const b = `
      b
      a
    `;

    const resultA = `
      1🔀a⏹️
      2🔀b⏹️
    `;

    const resultB = `
      2🔀b⏹️
      1🔀a⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multi characters move", () => {
    const a = `
      aa
      bb
    `;

    const b = `
      bb
      aa
    `;

    const resultA = `
      1🔀aa⏹️
      2🔀bb⏹️
    `;

    const resultB = `
      2🔀bb⏹️
      1🔀aa⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multi characters move 2", () => {
    const a = `
      console.log()
      let name = 'Elian'
      let age;
    `;

    const b = `
      let age;
      console.log()
      let name = 'Elian'
    `;

    const resultA = `
      1🔀console.log()
      let name = 'Elian'⏹️
      2🔀let age;⏹️
    `;

    const resultB = `
      2🔀let age;⏹️
      1🔀console.log()
      let name = 'Elian'⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("LCS case", () => {
    const a = `
      1
      2
      3
    `;

    const b = `
      1
      2
      'x'
      1
      2
      3
    `;

    const resultA = `
      1🔀1
      2
      3⏹️
    `;

    const resultB = `
      ➕1➕
      ➕2➕
      ➕'x'➕
      1🔀1
      2
      3⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("LCS case 2", () => {
    const a = `
      1
      2
      'x'
      1
      2
      3
    `;

    const b = `
      1
      2
      3
    `;

    const resultA = `
      ➖1➖
      ➖2➖
      ➖'x'➖
      1🔀1
      2
      3⏹️
    `;

    const resultB = `
      1🔀1
      2
      3⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("LCS case 3", () => {
    const a = `
      'x'
      1
      2
      3
    `;

    const b = `
      'x'
      1
      2
      1
      2
      3
    `;

    const resultA = `
      'x'
      1
      2
      1🔀3⏹️
    `;

    const resultB = `
      'x'
      1
      2
      ➕1➕
      ➕2➕
      1🔀3⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
});
