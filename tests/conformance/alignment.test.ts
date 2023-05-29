import { describe } from "vitest";
import { getTestFn } from "../utils";
import { OutputType, getDiff } from "../../src";

const test = getTestFn(getDiff, { outputType: OutputType.alignedText, alignmentText: "    <<Alignment>>\n" })

describe("Properly align code", () => {
  test({
    name: 'Basic case 1',
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
      ➖2
      3➖
    `,
    expB: `
      1
      <<Alignment>>
      <<Alignment>>
    `
  })

  test({
    name: 'Basic case 2',
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
      ➖3➖
    `,
    expB: `
      1
      2
      <<Alignment>>
    `
  })

  test({
    name: 'Basic case 3',
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
      ➖2➖
      3
    `,
    expB: `
      1
      <<Alignment>>
      3
    `
  })

  test({
    name: 'Basic case 4',
    a: `
      1
      2
      3
    `,
    b: `
      3
    `,
    expA: `
      ➖1
      2➖
      3
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      3
    `
  })

  test({
    name: 'Basic case 5',
    a: `
      1
      2
      3
    `,
    b: `
      3
    `,
    expA: `
      ➖1
      2➖
      3
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      3
    `
  })

  test({
    name: 'Basic case 6',
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
      ➖A➖
    `,
    expB: `
      ➕B➕
      123
      <<Alignment>>
    `
  })

  // TODO-NOW Compaction case
  test({
    only: 'standard',
    name: 'Basic case 7',
    a: `
      A
      123
    `,
    b: `
      B
      123
    `,
    expA: `
      ➖A➖
      123
    `,
    expB: `
      ➕B➕
      123
    `
  })

  test({
    name: 'Basic case 8',
    a: `
      x
      123
    `,
    b: `
      123
      x
    `,
    expA: `
      ⏩x⏪
      123
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>  
      123
      ⏩x⏪
    `
  })

  test({
    name: 'Basic case 9',
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
      ⏩x⏪
    `,
    expB: `
      ⏩x⏪
      123
      ➕z➕
    `
  })

  test({
    name: 'Basic case 10',
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
      ⏩x⏪
      5
    `,
    expB: `
      ⏩x⏪
      123
      ➕z➕
      5
    `
  })

  test({
    name: 'Basic case 11',
    a: `
      x y
      123
    `,
    b: `
      123
      x
    `,
    expA: `
      ⏩x⏪ ➖y➖
      123
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>
      123
      ⏩x⏪
    `
  })

  test({
    name: 'Basic case 12',
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
      ➕1
      2
      3➕
      console.log()
    `
  })

  // Test insertion into "lastA" and "lastB"
  test({
    name: 'Basic case 13',
    a: "xx\n1",
    b: "1\nxx",
    expA: "xx\n<<Alignment>>\n⏩1⏪",
    expB: "⏩1⏪\n<<Alignment>>\nxx"
  })

  test({
    name: 'Basic case 14',
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
      ➖1
      2
      3➖
      console.log()
    `,
    expB: `
      ➕4
      5➕
      console
      .log()
    `
  })

  // TODO(Alignment): Take the most wight in order to specify where to put the alignment, either at the beginning or the end
  test({
    name: 'Basic case 15',
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
  })

  test({
    name: 'Basic case 16',
    only: 'standard',
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
    expA: `
      ⏩xx⏪
      1
      2
      <<Alignment>>
      3
      4
    `,
    expB: `
      <<Alignment>>
      1
      2
      ⏩xx⏪
      3
      4
    `,

  })

  // TODO(Alignment): Take the most wight in order to specify where to put the alignment, either at the beginning or the end
  test({
    name: 'Basic case 17',
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
      ➖1➖
      <<Alignment>>
      <<Alignment>>
      <<Alignment>> 
      print(true) {}
    `,
  });

  test({
    name: 'Basic case 18',
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
      ➕1
      2➕
      z
    `,
  })

  test({
    name: 'Basic case 19',
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
      x ➖z
      1 2➖
      3
    `,
    expB: `
      x
      <<Alignment>>
      3
    `
  })

  test({
    name: 'Basic case 20',
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
      ⏩x⏪
      console.log(➖0➖)
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>
      console.log(➕1➕)
      ⏩x⏪
      ➕z➕
    `
  })

  test({
    name: 'Basic case 21',
    a: "fn(x)",
    b: "console.log(fn(1))",
    expA: "fn(➖x➖)",
    expB: "➕console.log(➕fn(➕1➕)➕)➕"
  })

  test({
    name: 'Basic case 22',
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
        { ➖a, b,➖ x } = obj
        <<Alignment>>
      }
    `,
    expB: `
      {
        { x } = obj
        ➕z➕
      }
    `
  })

  test({
    name: 'Basic case 23',
    a: `
      1 x
    `,
    b: `
      2
      x
    `,
    expA: `
      <<Alignment>>
      ➖1➖ x
    `,
    expB: `
      ➕2➕
      x
    `
  })

  test({
    name: 'Basic case 24',
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
      ➖1➖ {
          a: 1
        }
      <<Alignment>>
    `,
    expB: `
      ➕{➕
        {
          a: 1
        }
      ➕}➕
    `
  })

  test({
    name: 'Basic case 25',
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
      ➖1
      1➖
      x
      ➖1
      1➖
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      x
      <<Alignment>>
      <<Alignment>>
    `,
  });
})

describe("Properly format code", () => {
  test({
    name: 'Format 1',
    a: `
      console.log()
    `,
    b: `
      console.log(
      )
    `,
    expA: `
      <<Alignment>>
      console.log()
    `,
    expB: `
      console.log(
      )
    `
  })

  test({
    name: 'Format 2',
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
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      console.log()
    `
  })

  test({
    name: 'Format 3',
    a: `
      {}
    `,
    b: `
      {

      }
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      {}
    `
  })

  test({
    name: 'Format 4',
    a: `
      ()
      x
    `,
    b: `
      (

      )
      x
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      ()
      x
    `
  })

  test({
    name: "Format 4b",
    a: `
      ()
      start
      end
    `,
    b: `
      start
      (

      )
      end
    `,
    expA: `
      ⏩()⏪
      start
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      end
    `,
    expB: `
      <<Alignment>>
      start
      ⏩(

      )⏪
      end
    `
  })

  test({
    name: 'Format 4c',
    a: `
      ()
      x
      111
      222
      333
      zz
    `,
    b: `
      111
      222
      333
      (

      )
      x
      zz
    `,
    expA: `
      ⏩()
      x⏪
      111
      222
      333
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      111
      222
      333
      ⏩(

      )
      x⏪
    `
  })

  test({
    name: 'Format 5',
    a: `
      1 2
      x
    `,
    b: `
      1 2 x
    `,
    expB: `
      1 2 x
      <<Alignment>>
    `
  })

  // TODO: Another example of compression
  test({
    name: 'Format 6',
    a: `
      ()
    `,
    b: `
      (x)
    `,
    expA: `
      ➖()➖
    `,
    expB: `
      ➕(x)➕  
    `
  })

  test({
    name: 'Format 7',
    a: `
      1 2 3
    `,
    b: `
      1
      2
      3
    `,
    expA: `
      1 2 3
      <<Alignment>>
      <<Alignment>>
    `,
  })

  test({
    name: 'Format 8',
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
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      z
    `,
  })

  test({
    name: 'Format 9',
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
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      z
    `,
  })

  test({
    name: 'Format 10',
    a: `
      console.log()
      1
    `,
    b: `
      console.
      log()
    `,
    expA: `
      console.log()
      ➖1➖
    `,
  })

  // Testing the ignoring the push down of alignments
  test({
    name: 'Format 11',
    a: `
      x z 1
    `,
    b: `
      1

      x z
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      x z ⏩1⏪
    `,
    expB: `
      ⏩1⏪

      x z
      <<Alignment>>
      <<Alignment>>
    `
  })
})


describe('Properly ignore alignments', () => {
  test({
    name: 'Ignore alignment 1',
    a: `
      1 2
    `,
    b: `
      1
    `,
    expA: `
      1 ➖2➖
    `,
  })

  test({
    name: 'Ignore alignment 2',
    a: `
      x
      1 2
    `,
    b: `
      1
    `,
    expA: `
    ➖x➖
      1 ➖2➖
    `,
    expB: `
      <<Alignment>>
      1
    `
  })
})
