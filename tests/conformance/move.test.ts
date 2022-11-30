import { test } from "vitest";
import { getSimplifiedDiff } from "../../src";
import { validateDiff } from "../utils";

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

test.skip("LCS case 2", () => {
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

  validateDiff(resultA, resultB, sourceA, "sourceB");
});

test.skip("LCS case x", () => {
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
    1🔀'x'
    1
    2
    3⏹️
  `;

  const resultB = `
    ➖1➖
    ➖2➖
    ➖'x'➖
    1🔀1
    2
    3⏹️
  `;

  const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

  validateDiff(resultA, resultB, sourceA, sourceB);
});

test.skip("LCS case 3", () => {
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

  const resultA = a;

  const resultB = `
    'x'
    1
    2
    ➕1➕
    ➕2➕
    ➕3➕
  `;

  const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

  validateDiff(resultA, resultB, sourceA, sourceB);
});

test.skip("Multi characters move 2", () => {
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
  1🔀aa
  2🔀bb
  `;

  const resultB = `
  2🔀bb
  1🔀aa
  `;

  const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

  validateDiff(resultA, resultB, sourceA, sourceB);
});

test.skip("Line added and remove", () => {
  const a = `
  let up;
  let middle;
  `;

  const b = `
  let middle;
  let down;
  `;

  const resultA = `
  ➖let up➖;
  let middle;
  `;

  const resultB = `
  let up;
  let middle;
  ➖let down;➖
  `;

  const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

  validateDiff(resultA, resultB, sourceA, sourceB);
});
