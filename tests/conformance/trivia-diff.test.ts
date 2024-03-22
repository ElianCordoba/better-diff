import { describe, test } from "vitest";
import { getDiff } from "../../src";
import { validateDiff } from "../utils2";

describe("Ignore trivia", () => {
  test("Case 1", () => {
    const a = "a";

    const b = `
    a
    `;

    const resultA = a;
    const resultB = b;

    const { sourceA, sourceB } = getDiff(a, b);

    validateDiff(a, b, resultA, resultB, sourceA, sourceB);
  });

  test("Case 2", () => {
    const a = "a";

    const b = `
                a
    `;

    const resultA = a;
    const resultB = b;

    const { sourceA, sourceB } = getDiff(a, b);

    validateDiff(a, b, resultA, resultB, sourceA, sourceB);
  });

  test("Case 3", () => {
    const a = "console.log(1)";

    const b = `
        console . log( 
          1
    )
    `;

    const resultA = a;
    const resultB = b;

    const { sourceA, sourceB } = getDiff(a, b);

    validateDiff(a, b, resultA, resultB, sourceA, sourceB);
  });
});
