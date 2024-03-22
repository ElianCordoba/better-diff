import { describe } from "vitest";
import { getTestFn } from "../utils2";
import { getDiff2 } from "../../src/v2";

const test = getTestFn(getDiff2); //{ outputType: OutputType.alignedText, alignmentText: colorFn.cyan("<<Alignment>>"), ignoreChangeMarkers: true }

describe.skip("Properly align code", () => {
  test({
    name: "Basic case 1",
    a: `
      1
      2
      3
    `,
    b: `
      1
    `,
    expA: `
      1
      2
      3
    `,
    expB: `
      1
      <<Alignment>>
      <<Alignment>>
    `,
  });

  test({
    name: "Basic case 2",
    a: `
      1
      2
      3
    `,
    b: `
      1
      2
    `,
    expA: `
      1
      2
      3
    `,
    expB: `
      1
      2
      <<Alignment>>
    `,
  });

  test({
    name: "Basic case 3",
    a: `
      1
      2
      3
    `,
    b: `
      1
      3
    `,
    expA: `
      1
      2
      3
    `,
    expB: `
      1
      <<Alignment>>
      3
    `,
  });

  test({
    name: "Basic case 4",
    a: `
      1
      2
      3
    `,
    b: `
      3
    `,
    expA: `
      1
      2
      3
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      3
    `,
  });

  test({
    name: "Basic case 5",
    a: `
      1
      2
      3
    `,
    b: `
      3
    `,
    expA: `
      1
      2
      3
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      3
    `,
  });

  test({
    name: "Basic case 6",
    a: `
      123
      A
    `,
    b: `
      B
      123
    `,
    expA: `
      <<Alignment>>
      123
      A
    `,
    expB: `
      B
      123
      <<Alignment>>
    `,
  });

  test({
    only: "standard",
    name: "Basic case 7",
    a: `
      A
      123
    `,
    b: `
      B
      123
    `,
  });

  test({
    name: "Basic case 8",
    a: `
      x
      123
    `,
    b: `
      123
      x
    `,
    expA: `
      x
      123
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>  
      123
      x
    `,
  });

  test({
    name: "Basic case 9",
    disabled: true,
    a: `
      123
      x
    `,
    b: `
      x
      123
      z
    `,
    expA: `
      <<Alignment>>
      123
      x
    `,
    expB: `
      x
      123
      z
    `,
  });

  test({
    name: "Basic case 10",
    a: `
      123
      x
      5
    `,
    b: `
      x
      123
      z
      5
    `,
    expA: `
      <<Alignment>>
      123
      <<Alignment>>
      x
      5
    `,
    expB: `
      x
      123
      z
      <<Alignment>>
      5
    `,
  });

  test({
    name: "Basic case 11",
    a: `
      x y
      123
    `,
    b: `
      123
      x
    `,
    expA: `
      x y
      123
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>
      123
      x
    `,
  });

  test({
    name: "Basic case 12",
    a: `
      console.log()
    `,
    b: `
      1
      2
      3
      console.log()
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      console.log()
    `,
    expB: `
      1
      2
      3
      console.log()
    `,
  });

  // Test insertion into "lastA" and "lastB"
  test({
    name: "Basic case 13",
    a: "xx\n1",
    b: "1\nxx",
    expA: "<<Alignment>>\nxx\n1",
    expB: "1\nxx\n<<Alignment>>",
  });

  test({
    name: "Basic case 13b",
    a: `
      xx
      1
    `,
    b: `
      1
      xx
    `,
    expA: `
      <<Alignment>>
      xx
      1
    `,
    expB: `
      1
      xx
      <<Alignment>>
    `,
  });

  // Ignored backward because it's order dependant
  test({
    name: "Basic case 14",
    only: "standard",
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
      <<Alignment>>
      console.log()
    `,
    expB: `
      <<Alignment>>
      4
      5
      console
      .log()
    `,
  });

  // TODO(Alignment): Take the most wight in order to specify where to put the alignment, either at the beginning or the end
  test({
    name: "Basic case 15",
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
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      if (true) {}
      z 
    `,
  });

  test({
    name: "Basic case 16",
    only: "standard",
    a: `
      zzz
      1
      2
      3
      4
    `,
    b: `
      1
      2
      zzz
      3
      4
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      zzz
      1
      2
      3
      4
    `,
    expB: `
      1
      2
      zzz
      <<Alignment>>
      <<Alignment>>
      3
      4
    `,
  });

  // TODO(Alignment): Take the most wight in order to specify where to put the alignment, either at the beginning or the end
  test({
    name: "Basic case 17",
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

      }`,
  });

  test({
    name: "Basic case 18",
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
    expB: `
      x
      1
      2
      z
    `,
  });

  test({
    name: "Basic case 19",
    a: `
      x z
      1 2
      3
    `,
    b: `
      x
      3
    `,
    expA: `
      x z
      1 2
      3
    `,
    expB: `
      x
      <<Alignment>>
      3
    `,
  });

  test({
    name: "Basic case 20",
    a: `
      x
      console.log(0)
    `,
    b: `
      console.log(1)
      x
      z
    `,
    expA: `
      x
      console.log(0)
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>
      console.log(1)
      x
      z
    `,
  });

  test({
    name: "Basic case 21",
    a: "fn(x)",
    b: "console.log(fn(1))",
  });

  test({
    name: "Basic case 22",
    a: `
      {
        { a, b, x } = obj
      }
    `,
    b: `
      {
        { x } = obj
        z
      }
    `,
    expA: `
      {
        { a, b, x } = obj
        <<Alignment>>
      }
    `,
    expB: `
      {
        { x } = obj
        z
      }
    `,
  });

  test({
    name: "Basic case 23",
    a: `
      1 x
    `,
    b: `
      2
      x
    `,
    expA: `
      <<Alignment>>
      1 x
    `,
    expB: `
      2
      x
    `,
  });

  test({
    name: "Basic case 24",
    a: `
      1 {
        a: 1
      }
    `,
    b: `
      {
        {
          a: 1
        }
      }
    `,
    expA: `
      <<Alignment>>
      1 {
          a: 1
        }
      <<Alignment>>
    `,
    expB: `
      {
        {
          a: 1
        }
      }
    `,
  });

  test({
    name: "Basic case 25",
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
    expA: `
      1
      1
      x
      1
      1
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      x
      <<Alignment>>
      <<Alignment>>
    `,
  });

  test({
    name: "Basic case 26",
    a: `
      x z 1
      zz
    `,
    b: `
      1

      x z
      zz
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      x z 1
      zz
    `,
    expB: `
      1

      x z
      zz
    `,
  });
});

describe.skip("Properly ignore alignments", () => {
  test({
    name: "Ignore alignment 1",
    a: `
      1 2
    `,
    b: `
      1
    `,
    expA: `
      1 2
    `,
  });

  test({
    name: "Ignore alignment 2",
    a: `
      x
      1 2
    `,
    b: `
      1
    `,
    expA: `
    x
      1 2
    `,
    expB: `
      <<Alignment>>
      1
    `,
  });
});
