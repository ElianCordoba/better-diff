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
      🔀x⏹️
      123
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>  
      123
      🔀x⏹️
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
      🔀x⏹️
    `,
    expB: `
      🔀x⏹️
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
      🔀x⏹️
      5
    `,
    expB: `
      🔀x⏹️
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
      🔀x⏹️ ➖y➖
      123
      <<Alignment>>
    `,
    expB: `
      <<Alignment>>
      123
      🔀x⏹️
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
      ➕1➕
      ➕2➕
      ➕3➕
      console.log()
    `
  })

  // Test insertion into "lastA" and "lastB"
  test({
    name: 'Basic case 13',
    a: "xx\n1",
    b: "1\nxx",
    expA: "<<Alignment>>\nxx\n🔀1⏹️",
    expB: "🔀1⏹️\n<<Alignment>>\nxx"
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
      ➖1➖
      ➖2➖
      ➖3➖
      console.log()
      <<Alignment>>
    `,
    expB: `
      ➕4➕
      ➕5➕
      <<Alignment>>
      console.log()
    `
  })

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
      if (true) {}
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      z 
    `,
  })

  test({
    name: 'Basic case 16',
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
      🔀xx⏹️
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
      🔀xx⏹️
      3
      4
    `,

  })
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
      console.log()
      <<Alignment>>
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
      console.log()
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
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
      {}
      <<Alignment>>
      <<Alignment>>
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
      ()
      <<Alignment>>
      <<Alignment>>
      x
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