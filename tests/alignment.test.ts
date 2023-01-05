import { test as vTest } from "vitest";

import { getTextWithDiffs } from "../src";
import { getAlignedSources } from "../src/reporter";
import { validateDiff } from "./utils";

interface TestInfo {
  a: string;
  b: string;
  expA?: string;
  expB?: string;
}

let i = 0;
function test(testInfo: TestInfo) {
  const { a, b, expA, expB } = testInfo;
  i++;
  vTest(`Test ${i}`, () => {
    const { alignmentTable } = getTextWithDiffs(a, b);

    const { a: resultA, b: resultB } = getAlignedSources(
      alignmentTable,
      a,
      b,
      "   <<Alignment>>",
    );

    validateDiff(expA || a, expB || b, resultA, resultB);
  });

  vTest(`Test ${i} inverse`, () => {
    const { alignmentTable } = getTextWithDiffs(b, a);

    const { a: resultA, b: resultB } = getAlignedSources(
      alignmentTable,
      b,
      a,
      "   <<Alignment>>",
    );

    validateDiff(expB || b, expA || a, resultA, resultB);
  });
}

test({
  a: `
    print()
  `,
  b: `

    print()
  `,
  expA: `
    <<Alignment>>
    print()
  `,
});

test({
  a: `
    print()
  `,
  b: `


    print()
  `,
  expA: `
    <<Alignment>>
    <<Alignment>>
    print()
  `,
});

test({
  a: `

    print()
  `,
  b: `


    print()
  `,
  expA: `

    <<Alignment>>
    print()
  `,
});

test({
  a: `
    1
    print()
  `,
  b: `
    1

    print()
  `,
  expA: `
    1
    <<Alignment>>
    print()
  `,
});