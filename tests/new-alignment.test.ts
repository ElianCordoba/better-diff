import { test as vTest } from "vitest";

import { getAlignedDiff } from "../src";
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

test({
  name: 6,
  a: `
    xx
    1
    2
    3
    4
  `,
  b: `
    1
    2
    xx
    3
    4
  `,
  expB: `
    <<Alignment>>
    1
    2
    xx
    3
    4
  `,
})

test({
  name: 7,
  a: `
    xx
    zz
    1
    2
    3
    4
  `,
  b: `
    1
    2
    xx
    3
    4
    zz
  `,
  expB: `
    1
    2
    xx
    <<Alignment>>
    3
    4
    zz
  `
})

test({
  name: 8,
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
  `
})

test({
  name: 9,
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
  `
})

test({
  name: 10,
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
  `
})

// TODO(Improve) Este deberia ser dividido en partes, la del if deberia ser alineado por su cuenta
test({
  name: 11,
  a: `
    x
    if (true) {}
    z
  `,
  b: `
    x
    if (
      true
    ) {
    }
    z
  `,
  expA: `
    x 
    if (true) {}
    z
    <<Alignment>>
    <<Alignment>>
    <<Alignment>>
  `
})

test({
  name: 12,
  a: `
    x
  `,
  b: `

    x
  `,
  expB: `
    <<Alignment>>
    x 
  `
})