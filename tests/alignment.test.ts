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

// // 1
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
    <<Alignment>>
    print()
  `,
});

// TODO Review code with comment "not sure about this"
// 3
test({
  a: `
    1
    print(true) {}
  `,
  b: `
    print(
      true
    ) {

    }
  `,
  expA: `
    1
    <<Alignment>>
    <<Alignment>>
    <<Alignment>>
    <<Alignment>>
    print(true) {}
  `,
  expB: `
    <<Alignment>>
    print(
      true
    ) {

    }
  `,
});

// Move //
i = 0

// 1
test({
  a: `
    x
    a
  `,
  b: `
    x
  `,
  expB: `
    x
    <<Alignment>>
  `,
});

// 2
test({
  a: `
    a
    x
  `,
  b: `
    x
  `,
  expB: `
    <<Alignment>>
    x
  `,
});

// 3
test({
  a: `
    x
    a
  `,
  b: `
    a
  `,
  expB: `
    <<Alignment>>
    a
  `,
});

// 4
test({
  a: `
    a
    x
  `,
  b: `
    a
  `,
  expB: `
    a
    <<Alignment>>
  `,
});

// 5
test({
  a: `
    1
    1
    x
    1
    1
  `,
  b: `
    x
  `,
  expB: `
    <<Alignment>>
    <<Alignment>>
    x
    <<Alignment>>
    <<Alignment>>
  `,
});

// 6
test({
  a: `
    x
    z
  `,
  b: `
    x
    1
    2
    z
  `,
  expA: `
    x
    <<Alignment>>
    <<Alignment>>
    z
  `,
});

// 7
test({
  a: `
    x
    1
    2
  `,
  b: `
    x
    z
  `,
  expB: `
    x
    z
    <<Alignment>>
  `,
});

// 8
test({
  a: `
    console.log()
  `,
  b: `
    1
    2
    3
    console
    .
    log()
  `,
  expA: `
    <<Alignment>>
    <<Alignment>>
    <<Alignment>>
    <<Alignment>>
    <<Alignment>>
    console.log()
  `,
});