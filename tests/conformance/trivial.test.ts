import { describe, expect, test } from "vitest";
import { getSimplifiedDiff } from "../../src";
import { validateDiff } from "../utils";

describe("Basic tests", () => {
  test("Single line changes 1", () => {

    const a = "0"
    const b = "1"

    const resultA = "➖0➖"
    const resultB = "➕1➕"

    const { sourceA, sourceB } = getSimplifiedDiff(a, b)

    validateDiff(resultA, resultB, sourceA, sourceB)
  })

  test("Single line changes 2", () => {

    const a = "true"
    const b = "false"

    const resultA = "➖true➖"
    const resultB = "➕false➕"

    const { sourceA, sourceB } = getSimplifiedDiff(a, b)

    validateDiff(resultA, resultB, sourceA, sourceB)
  })

  test("Multi line change 1", () => {

    const a = `
    let name = "elian"
    `

    const b = `
    let firstName = "elian"
    `

    const resultA = `
    let ➖name➖ = "elian"
    `

    const resultB = `
    let ➕firstName➕ = "elian"
    `

    const { sourceA, sourceB } = getSimplifiedDiff(a, b)

    validateDiff(resultA, resultB, sourceA, sourceB)
  })

  test("Multi line change 2", () => {

    const a = `
    console.log(0)
    `

    const b = `
    console.log(1)
    `

    const resultA = `
    console.log(➖0➖)
    `

    const resultB = `
    console.log(➕1➕)
    `

    const { sourceA, sourceB } = getSimplifiedDiff(a, b)

    validateDiff(resultA, resultB, sourceA, sourceB)
  })

  test.only("Line added bellow", () => {

    const a = `
    let name;
    `

    const b = `
    let name;
    let age;
    `

    const resultA = `
    let name;
    `

    const resultB = `
    let name;
    ➕let age;➕
    `

    const { sourceA, sourceB } = getSimplifiedDiff(a, b)

    validateDiff(resultA, resultB, sourceA, sourceB)
  })
})
