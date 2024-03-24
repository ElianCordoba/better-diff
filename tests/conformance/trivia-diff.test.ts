import { describe, test } from "vitest";
import { getDiff2 } from "../../src/v2";
import { validateDiff } from "../utils2";
import { OutputType } from "../../src/v2/types";

describe("Ignore trivia", () => {
  test("Case 1", () => {
    const a = "a";

    const b = `
    a
    `;

    const resultA = a;
    const resultB = b;

    const { sourceA, sourceB } = getDiff2(a, b, { outputType: OutputType.text });

    validateDiff(a, b, resultA, resultB, sourceA, sourceB);
  });

  test("Case 2", () => {
    const a = "a";

    const b = `
                a
    `;

    const resultA = a;
    const resultB = b;

    const { sourceA, sourceB } = getDiff2(a, b, { outputType: OutputType.text });

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

    const { sourceA, sourceB } = getDiff2(a, b, { outputType: OutputType.text });

    validateDiff(a, b, resultA, resultB, sourceA, sourceB);
  });
});
