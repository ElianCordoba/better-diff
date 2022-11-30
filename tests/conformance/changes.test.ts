import { describe, test } from "vitest";
import { getSimplifiedDiff } from "../../src";
import { validateDiff } from "../utils";


describe("Properly report line changes", () => {
  test("Single line change 1", () => {
    const a = "0";
    const b = "1";

    const resultA = "➖0➖";
    const resultB = "➕1➕";

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Single line change 2", () => {
    const a = "true";
    const b = "false";

    const resultA = "➖true➖";
    const resultB = "➕false➕";

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Single line change 3", () => {
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

  test("Single line change 4", () => {
    const a = `
    let name = "elian"
    `;

    const b = `
    let name = "eliam"
    `;

    const resultA = `
    let name = ➖"elian"➖
    `;

    const resultB = `
    let name = ➕"eliam"➕
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Single line change 5", () => {
    const a = `
    let name = "elian"
    `;

    const b = `
    let firstName = "eliam"
    `;

    const resultA = `
    let ➖name➖ = ➖"elian"➖
    `;

    const resultB = `
    let ➕firstName➕ = ➕"eliam"➕
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Single line change 6", () => {
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
})