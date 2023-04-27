import { describe } from "vitest";
import { getTestFn } from "../utils";
import { OutputType, getDiff } from "../../src";

const test = getTestFn(getDiff, { outputType: OutputType.alignedText, alignmentText: "\n    <<Alignment>>" })

describe.only("Properly align code", () => {
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
      ➖2➖
      ➖3➖
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
      ➖1➖
      ➖2➖
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
      ➖1➖
      ➖2➖
      3
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      3
    `
  })

  test({
    name: 'Other 1',
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
      ➕1➕
      ➕2➕
      ➕3➕
      console.log()
    `
  })
})

// const test = getTestFn(getDiff, { outputType: OutputType.alignedText, other: { alignmentText: "   <<Alignment>>" } })

// test({
//   a: `
//     console.log()
//   `,
//   b: `
//     console.log(
//     )
//   `,
//   expA: `
//     console.log()
//     <<Alignment>>
//   `
// })

// test({
//   name: 2,
//   a: `
//     console.log()
//   `,
//   b: `
//     console
//     .log
//     (
//     )
//   `,
//   expA: `
//     console.log()
//     <<Alignment>>
//     <<Alignment>>
//     <<Alignment>>
//   `
// })

// test({
//   name: 3,
//   a: `
//     1
//     console.log()
//   `,
//   b: `
//     console.
//     log()
//   `,
//   expA: `
//     1
//     console.log()
//     <<Alignment>>
//   `,
//   expB: `
//     <<Alignment>>
//     console.
//     log()
//   `
// })

// test({
//   name: 4,
//   a: `
//     1
//     2
//     3
//     console.log()
//   `,
//   b: `
//     4
//     5
//     console.log()
//   `,
//   expA: `
//     1
//     2
//     3
//     console.log()
//   `,
//   expB: `
//     4
//     5
//     <<Alignment>>
//     console.log()
//   `
// })

// test({
//   name: 5,
//   a: `
//     1
//     2
//     3
//     console.log()
//   `,
//   b: `
//     4
//     5
//     console
//     .log()
//   `,
//   expA: `
//     1
//     2
//     3
//     console.log()
//     <<Alignment>>
//   `,
//   expB: `
//     4
//     5
//     <<Alignment>>
//     console
//     .log()
//   `
// })

// test({
//   name: 6,
//   a: `
//     xx
//     1
//     2
//     3
//     4
//   `,
//   b: `
//     1
//     2
//     xx
//     3
//     4
//   `,
//   expA: `
//     xx
//     <<Alignment>>
//     1
//     2
//     3
//     4
//   `,
//   expB: `
//     1
//     2
//     <<Alignment>>
//     xx
//     3
//     4
//   `,
// })

// test({
//   name: 7,
//   a: `
//     xx
//     zz
//     1
//     2
//     3
//     4
//   `,
//   b: `
//     1
//     2
//     xx
//     3
//     4
//     zz
//   `,
//   expB: `
//     1
//     2
//     xx
//     <<Alignment>>
//     3
//     4
//     zz
//   `
// })

// test({
//   name: 8,
//   a: `
//     x
//     a
//   `,
//   b: `
//     x
//   `,
//   expB: `
//     x
//     <<Alignment>>
//   `
// })

// test({
//   name: 9,
//   a: `
//     x
//     z
//   `,
//   b: `
//     x
//     1
//     2
//     z
//   `,
//   expA: `
//     x
//     <<Alignment>>
//     <<Alignment>>
//     z
//   `
// })

// test({
//   name: 10,
//   a: `
//     x
//     1
//     2
//   `,
//   b: `
//     x
//     z
//   `,
//   expB: `
//     x 
//     z
//     <<Alignment>>
//   `
// })

// // TODO(Improve) Este deberia ser dividido en partes, la del if deberia ser alineado por su cuenta
// test({
//   name: 11,
//   a: `
//     x
//     if (true) {}
//     z
//   `,
//   b: `
//     x
//     if (
//       true
//     ) {
//     }
//     z
//   `,
//   expA: `
//     x 
//     if (true) {}
//     z
//     <<Alignment>>
//     <<Alignment>>
//     <<Alignment>>
//   `
// })

// test({
//   name: 12,
//   a: `
//     x
//   `,
//   b: `

//     x
//   `,
//   expA: `
//     <<Alignment>>
//     x 
//   `
// })

// test({
//   name: 13,
//   a: `
//     x
//   `,
//   b: `


//     x
//   `,
//   expA: `
//     <<Alignment>>
//     <<Alignment>>
//     x 
//   `
// })

// test({
//   name: 14,
//   a: `

//     print()
//   `,
//   b: `


//     print()
//   `,
//   expA: `

//     <<Alignment>>
//     print()
//   `,
// });

// test({
//   name: 15,
//   a: `
//     1
//     print()
//   `,
//   b: `
//     1

//     print()
//   `,
//   expA: `
//     1
//     print()
//     <<Alignment>>
//   `,
// });

// test({
//   name: 16,
//   a: `
//     1
//     print()
//   `,
//   b: `

//     print()
//   `,
//   expA: `
//     1
//     <<Alignment>>
//     <<Alignment>>
//     print()
//   `,
//   expB: `
//     <<Alignment>>

//     print()
//   `
// });

// test({
//   name: 17,
//   a: `
//     1
//     x
//     2
//   `,
//   b: `
//     1

//     2
//   `,
//   expA: `
//     1
//     x
//     <<Alignment>>
//     2
//   `,
//   expB: `
//     1
//     <<Alignment>>

//     2
//   `,
// });

// test({
//   name: 18,
//   a: `
//     1
//     print()
//     2
//   `,
//   b: `
//     1

//     print()
//     2
//   `,
//   expA: `
//     1
//     print()
//     2
//     <<Alignment>>
//   `,
// });

// // TODO(Improve): Expected B should have one more alignment
// test({
//   name: 19,
//   a: `
//     1
//     2
//     3
//     print()
//   `,
//   b: `
//     print()
//   `,
//   expA: `
//     1
//     2
//     3
//     <<Alignment>>
//     print()
//   `,
//   expB: `
//     <<Alignment>>
//     <<Alignment>>
//     <<Alignment>>
//     print()
//   `,
// });

// test({
//   name: 20,
//   a: `
//     1x
//   `,
//   b: `
//     x
//   `,
// });

// test({
//   name: 21,
//   a: `
//     print()
//   `,
//   b: `
//     print
//     ()
//   `,
//   expA: `
//     print()
//     <<Alignment>>
//   `,
// });

// test({
//   name: 22,
//   a: `
//     print()
//   `,
//   b: `
//     print
//     (

//     )
//   `,
//   expA: `
//     print()
//     <<Alignment>>
//     <<Alignment>>
//     <<Alignment>>
//   `,
// });

// test({
//   name: 23,
//   a: `
//     1
//     print(true) {}
//   `,
//   b: `
//     print(
//       true
//     ) {

//     }
//   `,
//   expA: `
//     1
//     print(true) {}
//     <<Alignment>>
//     <<Alignment>>
//     <<Alignment>>
//     <<Alignment>>
//   `,
//   expB: `
//     <<Alignment>>
//     print(
//       true
//     ) {

//     }
//   `,
// });

// test({
//   name: 24,
//   a: `
//     1
//     1
//     x
//     1
//     1
//   `,
//   b: `
//     x
//   `,
//   expA: `
//     1
//     1
//     <<Alignment>>
//     x
//     1
//     1
//   `,
//   expB: `
//     <<Alignment>>
//     <<Alignment>>
//     x
//     <<Alignment>>
//     <<Alignment>>
//   `,
// });

// // TODO(Improve)
// // test({
// //   a: `
// //     console.log()
// //   `,
// //   b: `
// //     1
// //     2
// //     3
// //     console
// //     .
// //     log()
// //   `,
// //   expA: `
// //     <<Alignment>>
// //     <<Alignment>>
// //     <<Alignment>>
// //     <<Alignment>>
// //     <<Alignment>>
// //     console.log()
// //   `,
// // });