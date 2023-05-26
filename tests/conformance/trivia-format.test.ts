import { describe } from "vitest";
import { getTestFn } from "../utils";
import { OutputType, getDiff } from "../../src";

const test = getTestFn(getDiff, { outputType: OutputType.alignedText, alignmentText: "    <<Alignment>>\n" })

describe("Properly align formatted code", () => {
  test({
    name: 'Case 1',
    a: `
        x
      `,
    b: `
    
        x
      `,
    expA: `
        <<Alignment>>
        x 
      `
  })

  test({
    name: 'Case 2',
    a: `
      x
    `,
    b: `


      x
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      x 
    `
  })

  test({
    name: 'Case 3',
    a: `

        print()
      `,
    b: `


        print()
      `,
    expA: `

        <<Alignment>>
        print()
      `,
  });


  test({
    name: 'Case 4',
    a: `
      1
      print()
    `,
    b: `
      1

      print()
    `,
    expA: `
      1
      <<Alignment>>
      print()
    `,
  });

  test({
    name: 'Case 5',
    a: `
      1
      print()
    `,
    b: `

      print()
    `,
    expA: `
      ➖1➖
      print()
    `,
  });

  test({
    name: 'Case 6',
    a: `
      1
      x
      2
    `,
    b: `
      1

      2
    `,
    expA: `
      1
      ➖x➖
      2
    `,
  });


  test({
    name: 'Case 7',
    a: `
      1
      print()
      2
    `,
    b: `
      1

      print()
      2
    `,
    expA: `
      1
      <<Alignment>>
      print()
      2
    `,
  });

  test({
    name: 'Case 8',
    a: `
      1
      2
      3
      print()
    `,
    b: `
      print()
    `,
    expA: `
      ➖1
      2
      3➖
      print()
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      print()
    `,
  });

  test({
    name: 'Case 9',
    a: `
      1x
    `,
    b: `
      x
    `,
    expA: `
    ➖1➖x
    `
  });

  // TODO(Alignment): Take the most wight in order to specify where to put the alignment, either at the beginning or the end
  test({
    name: 'Case 10',
    a: `
      print()
    `,
    b: `
      print
      ()
    `,
    expA: `
      <<Alignment>>
      print()
    `,
  });

  test({
    name: 'Case 11',
    a: `
      print()
    `,
    b: `
      print
      (

      )
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      print()
    `,
  });


  test({
    name: 'Case 12',
    a: `
      console.log()
    `,
    b: `
      1
      2
      3
      console
      .
      log()
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      console.log()
    `,
    expB: `
      ➕1
      2
      3➕
      console
      .
      log()
    `
  });
})
