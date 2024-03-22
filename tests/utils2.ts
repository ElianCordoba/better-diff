import { expect, test as vTest } from "vitest";
import { getDiff2 } from "../src/v2/index";
import { OutputType } from "../src/v2/types";

interface TestInfo {
  disabled?: boolean;
  only?: "standard" | "inversed";
  name?: string | number;
  a?: string;
  b?: string;
  expA?: string;
  expB?: string;
}

export function getTestFn(testFn: typeof getDiff2) {
  return function test(testInfo: TestInfo) {
    const { a = "", b = "", expA, expB, name = "anonymous" } = testInfo;

    if (a === expA && b === expB) {
      throw new Error(`Invalid test ${name}, input and output are the same`);
    }

    if (testInfo.disabled) {
      return;
    }

    const skipStandardTest = testInfo.only === "inversed";

    if (!skipStandardTest) {
      vTest(`[Standard] ${name}`, () => {
        const { sourceA: resultA, sourceB: resultB } = testFn(a, b, { outputType: OutputType.text });

        validateDiff(expA || a, expB || b, resultA, resultB);
      });
    }

    const skipInversedTest = testInfo.only === "standard";

    if (!skipInversedTest) {
      vTest(`[Inversed] ${name}`, () => {
        const { sourceA: resultAA, sourceB: resultBB } = testFn(b, a, { outputType: OutputType.text });

        const inversedExpectedA = getInversedExpectedResult(expB || b);
        const inversedExpectedB = getInversedExpectedResult(expA || a);

        validateDiff(inversedExpectedA, inversedExpectedB, resultAA, resultBB);
      });
    }
  };
}

function getInversedExpectedResult(expected: string) {
  return expected.split("").map((char) => {
    if (char === "➖") {
      return "➕";
    } else if (char === "➕") {
      return "➖";
    } else {
      return char;
    }
  }).join("");
}

function trimLines(text: string) {
  return text.split("\n").map((s) => s.trim()).join("");
}

function validateDiff(
  expectedA: string,
  expectedB: string,
  resultA: string,
  resultB: string,
) {
  // expect(trimLines(resultA)).toEqual(trimLines(expectedA));
  // expect(trimLines(resultB)).toEqual(trimLines(expectedB));

  expect(resultA).toEqual(expectedA);
  expect(resultB).toEqual(expectedB);
}

export const test = getTestFn(getDiff2);
