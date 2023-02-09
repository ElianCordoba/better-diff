import { describe } from "vitest";
import { OutputType, getDiff } from "../../src";
import { validateDiff, test } from "../utils";

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
      🔀let age = 24⏹️ ➖&&➖ 🔀print('elian')⏹️
    `,
    expB: `
      🔀print('elian')⏹️
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
      let age = 24 ➖&&➖ 🔀print('elian')⏹️
    `,
    expB: `
      let age = 24
      🔀print('elian')⏹️
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
      let age = 🔀print('elian')⏹️ ➖&&➖ 🔀24⏹️
    `,
    expB: `
      let age = 🔀24⏹️
      🔀print('elian')⏹️
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
    🔀let age =⏹️ 🔀print('elian')⏹️ ➖&&➖ 🔀24⏹️
    `,
    expB: `
      🔀print('elian')⏹️
      🔀let age =⏹️ 🔀24⏹️
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
      let age = 24 ➖&&➖ 🔀print('elian')⏹️
      🔀fn()⏹️
      ➖1➖
    `,
    expB: `
      let age = 24 ➕||➕ 🔀fn()⏹️
      🔀print('elian')⏹️
    `
  })

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
      🔀let⏹️ ➖up➖🔀;⏹️
      🔀let middle;⏹️
    `,
    expB: `
      🔀let middle;⏹️
      🔀let⏹️ ➕down➕🔀;⏹️
    `
  })
});
