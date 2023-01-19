import { test as vTest } from "vitest";

import { getAlignedDiff, getTextWithDiffs } from "../src";
import { getAlignedSources } from "../src/reporter";
import { validateDiff } from "./utils";

interface TestInfo {
  name: string | number,
  a: string;
  b: string;
  expA?: string;
  expB?: string;
}

function test(testInfo: TestInfo) {
  const { a, b, expA, expB, name } = testInfo;

  vTest(`Test ${name}`, () => {
    const { a: resultA, b: resultB } = getAlignedDiff(
      a,
      b,
      {
        alignmentText: "   <<Alignment>>",
      }
    );

    validateDiff(expA || a, expB || b, resultA, resultB);
  });

  vTest(`Test ${name} inverse`, () => {
    const { a: resultA, b: resultB } = getAlignedDiff(
      b,
      a,
      {
        alignmentText: "   <<Alignment>>",
      }
    );

    validateDiff(expB || b, expA || a, resultA, resultB);
  });
}

test({
  name: 1,
  a: `
    console.log()
  `,
  b: `
    console.log(
    )
  `,
  expA: `
    console.log()
    <<Alignment>>
  `
})

test({
  name: 2,
  a: `
    console.log()
  `,
  b: `
    console
    .log
    (
    )
  `,
  expA: `
    console.log()
    <<Alignment>>
    <<Alignment>>
    <<Alignment>>
  `
})

test({
  name: 3,
  a: `
    1
    console.log()
  `,
  b: `
    console.
    log()
  `,
  expA: `
    1
    console.log()
    <<Alignment>>
  `,
  expB: `
    <<Alignment>>
    console.
    log()
  `
})

test({
  name: 4,
  a: `
    1
    2
    3
    console.log()
  `,
  b: `
    4
    5
    console.log()
  `,
  expA: `
    1
    2
    3
    console.log()
  `,
  expB: `
    4
    5
    <<Alignment>>
    console.log()
  `
})

test({
  name: 5,
  a: `
    1
    2
    3
    console.log()
  `,
  b: `
    4
    5
    console
    .log()
  `,
  expA: `
    1
    2
    3
    console.log()
    <<Alignment>>
  `,
  expB: `
    4
    5
    <<Alignment>>
    console
    .log()
  `
})