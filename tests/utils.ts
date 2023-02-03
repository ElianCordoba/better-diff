import { expect, test as vTest } from "vitest";
import { Options, OutputType, getDiff } from "../src";

// Re-use type
type TestFn = (...args: any[]) => {
  sourceA: string;
  sourceB: string;
}

interface TestInfo {
  only?: 'standard' | 'inversed' | undefined,
  name?: string | number,
  a?: string;
  b?: string;
  expA?: string;
  expB?: string;
}

const vTestOnly = vTest.only

export function getTestFn(testFn: TestFn, testOptions: Options = { outputType: OutputType.text }) {
  return function test(testInfo: TestInfo) {
    const { a = '', b = '', expA, expB, name = "anonymous" } = testInfo;

    if (a === expA && b === expB) {
      throw new Error('Invalid test, input and output are the same')
    }

    const _test = testInfo.only === 'standard' ? vTestOnly : vTest

    _test(`Test ${name}`, () => {
      const { sourceA: resultA, sourceB: resultB } = testFn(a, b, { outputType: testOptions.outputType } as Options)

      validateDiff(expA || a, expB || b, resultA, resultB);
    });

    const _testInversed = testInfo.only === 'inversed' ? vTestOnly : vTest

    _testInversed(`Test ${name} inverse`, () => {
      const { sourceA: resultA, sourceB: resultB } = testFn(b, a, { outputType: testOptions.outputType } as Options)

      const inversedExpectedA = getInversedExpectedResult(expB || b);
      const inversedExpectedB = getInversedExpectedResult(expA || a)

      validateDiff(inversedExpectedA, inversedExpectedB, resultA, resultB);
    });
  }
}

export function getInversedExpectedResult(expected: string) {
  return expected.split('').map(char => {
    if (char === "➖") {
      return "➕"
    } else if (char === "➕") {
      return "➖"
    } else {
      return char
    }
  }).join('')
}

export const test = getTestFn(getDiff)

export function validateDiff(
  expectedA: string,
  expectedB: string,
  resultA: string,
  resultB: string,
) {
  function trimLines(text: string) {
    return text.split("\n").map((s) => s.trim()).join("");
  }

  expect(trimLines(resultA)).toEqual(trimLines(expectedA));
  expect(trimLines(resultB)).toEqual(trimLines(expectedB));
}
