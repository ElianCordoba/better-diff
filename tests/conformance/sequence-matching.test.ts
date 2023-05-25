import { describe, test as vTest } from "vitest";
import { test } from "../utils";

describe("Properly report moves in a same sequence", () => {
  test({
    name: "Case 1",
    a: `
      let age = 24 && print('elian')
    `,
    b: `
      print('elian')
      let age = 24
    `,
    expA: `
      ⏩let age = 24⏪ ➖&&➖ print('elian')
    `,
    expB: `
      print('elian')
      ⏩let age = 24⏪
    `
  })

  test({
    name: "Case 2",
    a: `
      let age = 24 && print('elian')
    `,
    b: `
      let age = 24
      print('elian')
    `,
    expA: `
      let age = 24 ➖&&➖ print('elian')
    `,
    expB: `
      let age = 24
      print('elian')
    `
  })

  test({
    name: "Case 3",
    a: `
      let age = print('elian') && 24
    `,
    b: `
      let age = 24
      print('elian')
    `,
    expA: `
      let age = print('elian') ➖&&➖ ⏩24⏪
    `,
    expB: `
      let age = ⏩24⏪
      print('elian')
    `
  })

  test({
    name: "Case 4",
    a: `
      let age = print('elian') && 24
    `,
    b: `
      print('elian')
      let age = 24
    `,
    expA: `
      ⏩let age =⏪ print('elian') ➖&&➖ 24
    `,
    expB: `
      print('elian')
      ⏩let age =⏪ 24
    `
  })

  test({
    name: "Back and forth",
    a: `
      let age = 24 && print('elian')
      fn()
      1
    `,
    b: `
      let age = 24 || fn()
      print('elian')
    `,
    expA: `
      let age = 24 ➖&&➖ print('elian')
      ⏩fn()⏪
      ➖1➖
    `,
    expB: `
      let age = 24 ➕||➕ ⏩fn()⏪
      print('elian')
    `
  })

  // TODO: Can be improved
  test({
    name: "Mid sequence",
    a: `
      let up;
      let middle;
    `,
    b: `
      let middle;
      let down;
    `,
    expA: `
      ➖let up;➖
      let middle;
    `,
    expB: `
      let middle;
      ➕let down;➕
    `
  })
});

describe("Recursive matching", () => {
  test({
    name: "Recursive matching 1",
    a: `
      import { foo } from "foo";
      import { bar } from "bar";
    `,
    b: `
      1
      import { bar } from "bar";
    `,
    expA: `
      ➖import { foo } from "foo";➖
      import { bar } from "bar";
    `,
    expB: `
      ➕1➕
      import { bar } from "bar";
    `
  })

  test({
    name: "Recursive matching 2",
    a: `
      1 2 3
      1 2 3 4
    `,
    b: `
      1 2
      0
      1 
      0
      0
      1 2 3 4
    `,
    expA: `
      1 2 ➖3➖
      1 2 3 4
    `,
    expB: `
      1 2
      ➕0
      1 
      0
      0➕
      1 2 3 4
    `
  })

  test({
    name: "Recursive matching 3",
    a: `
      12
      12 34
      12 34 56
    `,
    b: `
      12 34 56
      0
      12
      0
      0
      12 34
    `,
    expA: `
      ⏩12⏪
      ⏩12 34⏪
      12 34 56
    `,
    expB: `
      12 34 56
      ➕0➕
      ⏩12⏪
      ➕0
      0➕
      ⏩12 34⏪
    `
  })

  test({
    name: "Recursive matching 4",
    a: `
      12
      12 34
      12 34 56
    `,
    b: `
      12 34 56
      0
      12
      0
      0
      12 34
    `,
    expA: `
      ⏩12⏪
      ⏩12 34⏪
      12 34 56
    `,
    expB: `
      12 34 56
      ➕0➕
      ⏩12⏪
      ➕0
      0➕
      ⏩12 34⏪
    `
  })

  // This tests going backward in the LCS calculation
  test({
    name: "Recursive matching 5",
    a: `
      let start

      export function bar(range) {
        return {
          start: range.start
        };
      }
    `,
    b: `
      function foo() { }

      export function bar(range) {
        return {
          start: range.start
        };
      }
    `,
    expA: `
      ➖let start➖

      export function bar(range) {
        return {
          start: range.start
        };
      }
    `,
    expB: `
      ➕function foo() { }➕

      export function bar(range) {
        return {
          start: range.start
        };
      }
    `
  })

  // This tests the subsequence matching
  test({
    name: "Recursive matching 6",
    a: `
      1
      import { Y } from "./y";
      import { X } from "./x";
    `,
    b: `
      1
      import { X } from "./x";
    `,
    expA: `
      1
      ➖import { Y } from "./y";➖
      import { X } from "./x";
    `,
    expB: `
      1
      import { X } from "./x";
    `
  })


  test({
    name: "Random 1",
    a: `
      1
      2
      33 
    `,
    b: `
      33
      2
    `,
    expA: `
      ➖1➖
      ⏩2⏪
      33
    `,
    expB: `
      33
      ⏩2⏪
    `
  })

  // The bug that we are testing here is if we have 2 moves, crossing each other and both are of the same length. The result
  // is that depending of which one gets processed first, that will be aligned, this means that the result is not the same A to B and B to A,
  // this is why I had to create the cases separated
  test({
    only: 'standard',
    name: "Random 2 standard",
    a: `
      1
      2
      3
      4
    `,
    b: `
      5
      4
      3
    `,
    expA: `
      ➖1
      2➖
      ⏩3⏪
      4
    `,
    expB: `
      ➕5➕
      4
      ⏩3⏪
    `
  })

  test({
    only: 'inversed',
    name: "Random 2 inversed",
    a: `
      1
      2
      3
      4
    `,
    b: `
      5
      4
      3
    `,
    expA: `
      ➖1
      2➖
      3
      ⏩4⏪
    `,
    expB: `
      ➕5➕
      ⏩4⏪
      3
    `
  })

  // Used to crash when inserting new line alignments in "processMoves" when aligning two moves
  test({
    name: "Random 3",
    a: `
      1
      22
    `,
    b: `
      22
      x
      1
    `,
    expA: `
      ⏩1⏪
      22
    `,
    expB: `
      22
      ➕x➕
      ⏩1⏪
    `
  })
})