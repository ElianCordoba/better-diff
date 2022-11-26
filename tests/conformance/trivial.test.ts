import { describe, test } from "vitest";
import { getSimplifiedDiff } from "../../src";
import { validateDiff } from "../utils";

describe("Basic tests", () => {
  test("Ignore trivia", () => {
    const a = "a";

    const b = `
    a
    `;

    const resultA = a
    const resultB = a

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Single line changes 1", () => {
    const a = "0";
    const b = "1";

    const resultA = "➖0➖";
    const resultB = "➕1➕";

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Single line changes 2", () => {
    const a = "true";
    const b = "false";

    const resultA = "➖true➖";
    const resultB = "➕false➕";

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multi line change 1", () => {
    const a = `
    let name = "elian"
    `;

    const b = `
    let firstName = "elian"
    `;

    const resultA = `
    let ➖name➖ = "elian"
    `;

    const resultB = `
    let ➕firstName➕ = "elian"
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Multi line change 2", () => {
    const a = `
    console.log(0)
    `;

    const b = `
    console.log(1)
    `;

    const resultA = `
    console.log(➖0➖)
    `;

    const resultB = `
    console.log(➕1➕)
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Line added bellow", () => {
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
    ➕let age;➕
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Line removed bellow", () => {
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
});

test("Multiple lines added", () => {
  const a = `
  `;

  const b = `
  let a;
  let b;
  `;

  const resultA = `
  `;

  const resultB = `
  ➕let a;➕
  ➕let b;➕
  `;

  const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

  validateDiff(resultA, resultB, sourceA, sourceB);
});

test("Multiple lines added 2", () => {
  const a = `
  `;

  const b = `
  let a;
  let b;
  let c;
  `;

  const resultA = `
  `;

  const resultB = `
  ➕let a;➕
  ➕let b;➕
  ➕let c;➕
  `;

  const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

  validateDiff(resultA, resultB, sourceA, sourceB);
});

test("Multiple lines added 3. With trivia", () => {
  const a = `
  `;

  const b = `let a;
    let b;
  `;

  const resultA = `
  `;

  const resultB = `➕let a;➕
    ➕let b;➕
  `;

  const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

  validateDiff(resultA, resultB, sourceA, sourceB);
});

test("Multiple lines removed 2", () => {
  const a = `
  let a;
  let b;
  let c;
  `;

  const b = `
  `;

  const resultA = `
  ➖let a;➖
  ➖let b;➖
  ➖let c;➖
  `;

  const resultB = `
  `;

  const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

  validateDiff(resultA, resultB, sourceA, sourceB);
});
