import { describe, test } from "vitest";
import { getSimplifiedDiff } from "../../src";
import { validateDiff } from "../utils";

describe("Properly report moves in a same sequence", () => {
  test.only("One line splitted into two. Case 1", () => {
    let a = `
      let age = 24 && print('elian')
    `;

    let b = `
      print('elian')
      let age = 24
    `;

    const resultA = `
      1🔀let age = 24⏹️ ➖&&➖ 2🔀print('elian')⏹️
    `;

    const resultB = `
      2🔀print('elian')⏹️
      1🔀let age = 24⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test.only("One line splitted into two. Case 2", () => {
    let a = `
      let age = 24 && print('elian')
    `;

    let b = `
      let age = 24
      print('elian')
    `;

    const resultA = `
      let age = 24 ➖&&➖ 1🔀print('elian')⏹️
    `;

    const resultB = `
      let age = 24
      1🔀print('elian')⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test.only("One line splitted into two. Case 3", () => {
    let a = `
      let age = print('elian') && 24
    `;

    let b = `
      print('elian')
      let age = 24
    `;

    const resultA = `
      2🔀let age =⏹️ 1🔀print('elian')⏹️ ➖&&➖ 3🔀24⏹️
    `;

    const resultB = `
      1🔀print('elian')⏹️
      2🔀let age =⏹️ 3🔀24⏹️
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("One line splitted into two. Case 4", () => {
    let a = `
      let age = print('elian') && 24
    `;

    let b = `
      let age = 24
      print('elian')
    `;

    const resultA = `
      TODO
    `;

    const resultB = `
      TODO
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Two lines merged into one. Case 1", () => {
    let a = `
      let age = 24
      print('elian')
    `;

    let b = `
      let age = 24 && print('elian')
    `;

    const resultA = `
      TODO
    `;

    const resultB = `
    TODO
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Two lines merged into one. Case 2", () => {
    let a = `
      print('elian')
      let age = 24
    `;

    let b = `
      let age = 24 && print('elian')
    `;

    const resultA = `
    TODO
    `;

    const resultB = `
    TODO
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Two lines merged into one. Case 3", () => {
    let a = `
      let age = 24
      print('elian')
    `;

    let b = `
      let age = print('elian') && 24
    `;

    const resultA = `
    TODO
    `;

    const resultB = `
    TODO
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Two lines merged into one. Case 4", () => {
    let a = `
      print('elian')
      let age = 24
    `;

    let b = `
      let age = print('elian') && 24
    `;

    const resultA = `
    TODO
    `;

    const resultB = `
    TODO
    `;

    const [{ sourceA, sourceB }] = getSimplifiedDiff(a, b);

    validateDiff(resultA, resultB, sourceA, sourceB);
  });


})