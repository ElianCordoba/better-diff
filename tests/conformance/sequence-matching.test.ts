import { describe } from "vitest";
import { test } from "../utils";

test({
  name: "Simple move",
  a: `
    a
    b
  `,
  b: `
    b
    a
  `,
  expA: `
  🔀a⏹️
  🔀b⏹️
  `,
  expB: `
  🔀b⏹️
  🔀a⏹️
  `
})

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
      🔀let age = 24⏹️ ➖&&➖ print('elian')
    `,
    expB: `
      print('elian')
      🔀let age = 24⏹️
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
      let age = print('elian') ➖&&➖ 🔀24⏹️
    `,
    expB: `
      let age = 🔀24⏹️
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
      🔀let age =⏹️ print('elian') ➖&&➖ 24
    `,
    expB: `
      print('elian')
      🔀let age =⏹️ 24
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
      🔀fn()⏹️
      ➖1➖
    `,
    expB: `
      let age = 24 ➕||➕ 🔀fn()⏹️
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
      ➖let➖ ➖up;➖
      let middle;
    `,
    expB: `
      let middle;
      ➕let➕ ➕down;➕
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
      ➖import➖ ➖{➖ ➖foo➖ ➖}➖ ➖from➖ ➖"foo";➖
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
      ➕0➕
      ➕1➕ 
      ➕0➕
      ➕0➕
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
      🔀12⏹️
      🔀12 34⏹️
      🔀12 34 56⏹️
    `,
    expB: `
      🔀12 34 56⏹️
      ➕0➕
      🔀12⏹️
      ➕0➕
      ➕0➕
      🔀12 34⏹️
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
      🔀12⏹️
      🔀12 34⏹️
      🔀12 34 56⏹️
    `,
    expB: `
      🔀12 34 56⏹️
      ➕0➕
      🔀12⏹️
      ➕0➕
      ➕0➕
      🔀12 34⏹️
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
      ➖let➖ ➖start➖

      🔀export function bar(range) {
        return {
          start: range.start
        };
      }⏹️
    `,
    expB: `
      ➕function➕ ➕foo()➕ ➕{➕ ➕}➕

      🔀export function bar(range) {
        return {
          start: range.start
        };
      }⏹️
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
      ➖import➖ ➖{➖ ➖Y➖ ➖}➖ ➖from➖ ➖"./y";➖
      🔀import { X } from "./x";⏹️
    `,
    expB: `
      1
      🔀import { X } from "./x";⏹️
    `
  })


})