import { describe } from "vitest";
import { test } from "../utils";

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
      ➖let name➖ = "elian"
    `,
    expB: `
      ➕let firstName➕ = "elian"
    `,
  });

  test({
    name: "Single line change 4",
    a: `
      let name = "elian"
    `,
    b: `
      let name = "eliam"
    `,
    expA: `
      let name = ➖"elian"➖
    `,
    expB: `
      let name = ➕"eliam"➕
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

  // TODO: This test got downgraded with the inclusion of the single node matching policy, if we introduce an LCS skip count nodes we may regain the old output
  test({
    name: "Multi line change",
    a: `
      let name = "elian"
    `,
    b: `
      let firstName = "eliam"
    `,
    expA: `
      ➖let name = "elian"➖
    `,
    expB: `
      ➕let firstName = "eliam"➕
    `,
  });
});
