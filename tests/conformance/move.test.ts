import { describe, test } from "vitest";
import { getTextWithDiffs } from "../../src";
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

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Properly match closing paren", () => {
    const a = `
      console.log()
    `;

    const b = `
      console.log(fn())
    `;

    const resultA = `
      console.log(1🔀)⏹️
    `;

    const resultB = `
      console.log(➕fn()➕1🔀)⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Mix of move with deletions and additions", () => {
    const a = `
      console.log() && 3
    `;

    const b = `
      fn(console.log())
    `;

    const resultA = `
      1🔀console.log()⏹️ ➖&&➖ ➖3➖
    `;

    const resultB = `
      ➕fn(➕1🔀console.log()⏹️➕)➕
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
});
