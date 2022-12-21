import { describe, test } from "vitest";
import { getTextWithDiffs } from "../../src";
import { validateDiff } from "../utils";

describe("Properly report moves in a same sequence", () => {
  test("One line splitted into two. Case 1", () => {
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

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("One line splitted into two. Case 2", () => {
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

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("One line splitted into two. Case 3", () => {
    let a = `
      let age = print('elian') && 24
    `;

    let b = `
      print('elian')
      let age = 24
    `;

    const resultA = `
      3🔀let age =⏹️ 1🔀print('elian')⏹️ ➖&&➖ 2🔀24⏹️
    `;

    const resultB = `
      1🔀print('elian')⏹️
      3🔀let age =⏹️ 2🔀24⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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
      let age = 1🔀print('elian')⏹️ ➖&&➖ 2🔀24⏹️
    `;

    const resultB = `
      let age = 2🔀24⏹️
      1🔀print('elian')⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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
      let age = 24
      1🔀print('elian')⏹️
    `;

    const resultB = `
      let age = 24 ➕&&➕ 1🔀print('elian')⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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
      1🔀print('elian')⏹️
      2🔀let age = 24⏹️
    `;

    const resultB = `
      2🔀let age = 24⏹️ ➕&&➕ 1🔀print('elian')⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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
      let age = 1🔀24⏹️
      2🔀print('elian')⏹️
    `;

    const resultB = `
      let age = 2🔀print('elian')⏹️ ➕&&➕ 1🔀24⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

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
      1🔀print('elian')⏹️
      2🔀let age =⏹️ 3🔀24⏹️
    `;

    const resultB = `
      2🔀let age =⏹️ 1🔀print('elian')⏹️ ➕&&➕ 3🔀24⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Back and forth example", () => {
    let a = `
      let age = 24 && print('elian')
      fn()
      1
    `;

    let b = `
      let age = 24 || fn()
      print('elian')
    `;

    const resultA = `
      let age = 24 ➖&&➖ 1🔀print('elian')⏹️
      2🔀fn()⏹️
      ➖1➖
    `;

    const resultB = `
      let age = 24 ➕||➕ 2🔀fn()⏹️
      1🔀print('elian')⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });

  test("Mid sequence", () => {
    const a = `
      let up;
      let middle;
    `;

    const b = `
      let middle;
      let down;
    `;

    const resultA = `
      2🔀let⏹️ ➖up➖3🔀;⏹️
      1🔀let middle;⏹️
    `;

    const resultB = `
      1🔀let middle;⏹️
      2🔀let⏹️ ➕down➕3🔀;⏹️
    `;

    const { sourceA, sourceB } = getTextWithDiffs(a, b).diffs;

    validateDiff(resultA, resultB, sourceA, sourceB);
  });
});
