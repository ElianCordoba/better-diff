import { describe, test } from "vitest";
import { getTextWithDiffs } from "../src";
import { getAlignedSources } from "../src/reporter";
import { validateDiff } from "./utils";

describe("Align source after diffing", () => {
  test("Simple align. Case 1", () => {
    const a = `
      x
      a
    `;

    const b = `
      x
    `;

    const expectedA = a;
    const expectedB = `
      x
      <<Alignment>>
    `;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Simple align. Case 2", () => {
    const a = `
      a
      x
    `;

    const b = `
      x
    `;

    const expectedA = a;
    const expectedB = `
      <<Alignment>>
      x
    `;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Simple align. Case 3", () => {
    const a = `
      x
    `;

    const b = `
      x
      a
    `;

    const expectedA = `
      x
      <<Alignment>>
    `;
    const expectedB = b;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Simple align. Case 4", () => {
    const a = `
      x
    `;

    const b = `
      a
      x
    `;

    const expectedA = `
      <<Alignment>>
      x
    `;
    const expectedB = b;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Simple align. Case 5", () => {
    const a = `
      1
      1
      x
      1
      1
    `;

    const b = `
      x
    `;

    const expectedA = a;
    const expectedB = `
      <<Alignment>>
      <<Alignment>>
      x
      <<Alignment>>
      <<Alignment>>
    `;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Simple align. Case 6", () => {
    const a = `
      console.log(1)
    `;

    const b = `
      console
      .
      log
      (1)
    `;

    const expectedA = `
      console.log(1)
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
    `;
    const expectedB = b;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Align move. Case 1", () => {
    const a = `
      x
      z
    `;

    const b = `
      x
      1
      2
      z
    `;

    const expectedA = `
      x
      <<Alignment>>
      <<Alignment>>
      z
    `;
    const expectedB = b;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Align move. Case 2", () => {
    const a = `
      x
      1
      2
    `;

    const b = `
      x
      z
    `;

    const expectedA = `
      x
      1
      2
    `;

    const expectedB = `
      x
      z
      <<Alignment>>
    `;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Align format change. Case 1", () => {
    const a = `
      console.log()
    `;

    const b = `
      1
      2
      3
      console
      .
      log()
    `;

    const expectedA = `
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      console.log()
      <<Alignment>>
      <<Alignment>>
    `;

    const expectedB = `
      1
      2
      3
      console
      .
      log()
    `;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test("Align format change", () => {
    const a = `
      1
      console.log()
      2
    `;

    const b = `
      1
      console
      .
      log()
      2
    `;

    const expectedA = `
      1
      console.log()
      <<Alignment>>
      <<Alignment>>
      2
    `;

    const expectedB = b;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test.skip("Align with trivia. Case 1", () => {
    const a = `
      console.log()
    `;

    const b = `


      console.log()
    `;

    const expectedA = `
      <<Alignment>>
      <<Alignment>>
      console.log()
    `;

    const expectedB = b;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test.skip("Align with trivia. Case 2", () => {
    const a = `
      console.log()


    `;

    const b = `
      console.log()
    `;

    const expectedA = a;

    const expectedB = `
      console.log()
      <<Alignment>>
      <<Alignment>>
    `;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  test.skip("Align with new lines added", () => {
    const a = `
      console.log()
    `;

    const b = `
      1
      2


      console.log()
    `;

    const expectedA = `
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      console.log()
    `;

    const expectedB = `
      1
      2
      <<Alignment>>
      <<Alignment>>
      console.log()
    `;

    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(alignmentTable, a, b, "<<Alignment>>");

    validateDiff(expectedA, expectedB, resultA, resultB);
  });

  // TODO: https://github.com/ElianCordoba/better-diff/issues/19
  // let a = `
  //   1
  //   finale
  //   x
  //   y
  // `;

  // let b = `
  //   1
  //   \`
  //     1
  //   \`
  //   finale
  //   z
  //   y
  // `;
});
