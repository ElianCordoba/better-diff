import { describe } from "vitest";
import { test } from "../utils";

describe("Properly report lines added and removed", () => {
  test({
    name: "Single line added bellow",
    a: `
      let name;
    `,
    b: `
      let name;
      let age;
    `,
    expB: `
      let name;
      ➕let age;➕
    `
  })

  test({
    name: "Single line added above",
    a: `
      let name;
    `,
    b: `
      let age;
      let name;
    `,
    expA: `
      let name;
    `,
    expB: `
      ➕let age;➕
      let name;
    `
  })

  test({
    name: "Multiple lines added 1",
    b: `
      let a;
      let b;
    `,
    expB: `
      ➕let a;
      let b;➕
    `
  })

  test({
    name: "Multiple lines added 2",
    b: `
      let a;
      let b;
      let c;
    `,
    expB: `
      ➕let a;
      let b;
      let c;➕
    `
  })

  test({
    name: "Multiple lines added 3. With trivia",
    b: `let a;
      let b;
    `,
    expB: `➕let a;
    let b;➕
  `
  })

  test({
    name: "Added wrapped code",
    a: `
      callFn()
    `,
    b: `
      while (true) {
        callFn()
      }
    `,
    expA: `
      callFn()
    `,
    expB: `
      ➕while (true) {➕
        callFn()
      ➕}➕
    `
  })

  // This used to crash
  test({
    name: "Mix",
    a: `
      3
    `,
    b: `
      () {}
    `,
    expA: `
      ➖3➖
    `,
    expB: `
      ➕() {}➕
    `
  })
});
