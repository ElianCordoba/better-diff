import { describe } from "vitest";
import { test } from "../utils";

describe("Properly report lines added", () => {
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

  test({
    name: "Multi characters move",
    a: `
      aa
      bb
    `,
    b: `
      bb
      aa
    `,
    expA: `
      🔀aa⏹️
      🔀bb⏹️
    `,
    expB: `
      🔀bb⏹️
      🔀aa⏹️
    `
  })

  test({
    name: "Multi characters move 2",
    a: `
      console.log()
      let name = 'Elian'
      let age;
    `,
    b: `
      let age;
      console.log()
      let name = 'Elian'
    `,
    expA: `
      🔀console.log()
      let name = 'Elian'⏹️
      🔀let age;⏹️
    `,
    expB: `
      🔀let age;⏹️
      🔀console.log()
      let name = 'Elian'⏹️
    `
  })

  test({
    name: "LCS case 1",
    a: `
      1
      2
      3
    `,
    b: `
      1
      2
      'x'
      1
      2
      3
    `,
    expA: `
      🔀1
      2
      3⏹️
    `,
    expB: `
      ➕1➕
      ➕2➕
      ➕'x'➕
      🔀1
      2
      3⏹️
    `
  })

  test({
    name: "LCS case 2",
    a: `
      'x'
      1
      2
      3
    `,
    b: `
      'x'
      1
      2
      1
      2
      3
    `,
    expA: `
      'x'
      1
      2
      🔀3⏹️
    `,
    expB: `
      'x'
      1
      2
      ➕1➕
      ➕2➕
      🔀3⏹️
    `
  })

  test({
    name: "Mix of move with deletions and additions",
    a: `
      console.log() && 3
    `,
    b: `
      fn(console.log(2))
    `,
    expA: `
      🔀console.log(⏹️🔀)⏹️ ➖&&➖ ➖3➖
    `,
    expB: `
      ➕fn(➕🔀console.log(⏹️➕2➕🔀)⏹️➕)➕
    `
  })

  test({
    name: "Mix of move with deletions and additions 2",
    a: `
      fn(x)
    `,
    b: `
      console.log(fn(1))
    `,
    expA: `
      🔀fn(⏹️➖x➖🔀)⏹️
    `,
    expB: `
      ➕console.log(➕🔀fn(⏹️➕1➕🔀)⏹️➕)➕
    `
  })

  test({
    name: "Mix of move with deletions and additions 3",
    a: `
      console.log() && 3
    `,
    b: `
      fn(console.log(2))
    `,
    expA: `
      🔀console.log(⏹️🔀)⏹️ ➖&&➖ ➖3➖
    `,
    expB: `
      ➕fn(➕🔀console.log(⏹️➕2➕🔀)⏹️➕)➕
    `
  })

  // TODO: Unhandled case here
  test({
    only: 'standard',
    name: "Properly match closing paren",
    a: `
      console.log()
    `,
    b: `
      console.log(fn())
    `,
    expA: `
      console.log()
    `,
    expB: `
      console.log(➕fn()➕)
    `
  })

  test({
    name: "Properly match closing paren 2",
    a: `
      if (true) {
        print()
      }  
    `,
    b: `
      z
      print(123)
      x
    `,
    expA: `
      ➖if➖ ➖(true)➖ ➖{➖
        🔀print(⏹️🔀)⏹️
      ➖}➖
    `,
    expB: `
      ➕z➕
      🔀print(⏹️➕123➕🔀)⏹️
      ➕x➕
    `
  })

  test({
    name: "Properly match closing paren 3",
    a: `
      console.log() && 3
    `,
    b: `
      function asd () {
        console.log("hi")
      }
    `,
    expA: `
      🔀console.log(⏹️🔀)⏹️ ➖&&➖ ➖3➖
    `,
    expB: `
      ➕function➕ ➕asd➕ ➕()➕ ➕{➕
        🔀console.log(⏹️➕"hi"➕🔀)⏹️
      ➕}➕
    `
  })

  test({
    name: "Properly match closing paren 3",
    a: `
      321
      if (true) {
        print()
      }
    `,
    b: `
      print(123)
    `,
    expA: `
      ➖321➖
      ➖if➖ ➖(true)➖ ➖{➖
        🔀print(⏹️🔀)⏹️
      ➖}➖
    `,
    expB: `
      🔀print(⏹️➕123➕🔀)⏹️
    `
  })
});
