import { describe } from "vitest";
import { test } from "../utils2";

describe("Properly report line changed", () => {
  test({
    name: "Single line change 1",
    a: `
      0
    `,
    b: `
      1
    `,
    expA: `
      ➖0➖
    `,
    expB: `
      ➕1➕
    `,
  });

  test({
    name: "Single line change 2",
    a: `
      true
    `,
    b: `
      false
    `,
    expA: `
      ➖true➖
    `,
    expB: `
      ➕false➕
    `,
  });

  test({
    name: "Single line change 3",
    a: `
      let name = "elian"
    `,
    b: `
      let firstName = "elian"
    `,
    expA: `
      let ➖name➖ = "elian"
    `,
    expB: `
      let ➕firstName➕ = "elian"
    `,
  });

  test({
    name: "Single line change 4",
    a: `
      let name = "elian"
    `,
    b: `
      let name = "fernando"
    `,
    expA: `
      let name = ➖"elian"➖
    `,
    expB: `
      let name = ➕"fernando"➕
    `,
  });

  test({
    name: "Single line change 5",
    a: `
      console.log(0)
    `,
    b: `
      console.log(1)
    `,
    expA: `
      console.log(➖0➖)
    `,
    expB: `
      console.log(➕1➕)
    `,
  });

  test({
    name: "Multi line change",
    a: `
      let name = "elian"
    `,
    b: `
      let firstName = "fernando"
    `,
    expA: `
      let ➖name➖ = ➖"elian"➖
    `,
    expB: `
      let ➕firstName➕ = ➕"fernando"➕
    `,
  });
});
