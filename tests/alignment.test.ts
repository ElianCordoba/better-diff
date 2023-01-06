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

// Trivia tests

// 1
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

// 2
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

// 3
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

// 4
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

// 5
test({
  a: `
    1
    print()
    2
  `,
  b: `
    1

    print()
    2
  `,
  expA: `
    1
    <<Alignment>>
    print()
    2
  `,
});

// 6
test({
  a: `
    1
    x
    2
  `,
  b: `
    1

    2
  `,
  expA: `
    1
    x
    <<Alignment>>
    2
  `,
  expB: `
    1
    <<Alignment>>

    2
  `,
});


// 7
test({
  a: `
    1
    print()
    2
  `,
  b: `
    1

    print()
    2
  `,
  expA: `
    1
    <<Alignment>>
    print()
    2
  `,
});

// 8
test({
  a: `
    1
    2
    3
    print()
  `,
  b: `
    print()
  `,
  expB: `
    <<Alignment>>
    <<Alignment>>
    <<Alignment>>
    print()
  `,
});

// Format tests //

i = 0

// TODO(Improve)

// 1
test({
  a: `
    print()
  `,
  b: `
    print
    ()
  `,
  expA: `
    <<Alignment>>
    print()
  `,
});

// 2
test({
  a: `
    print()
  `,
  b: `
    print
    (

    )
  `,
  expA: `
    <<Alignment>>
    <<Alignment>>
    print()
  `,
});