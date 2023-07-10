import { describe } from "vitest";
import { getTestFn } from "../utils";
import { OutputType, getDiff } from "../../src";

const test = getTestFn(getDiff, { outputType: OutputType.alignedText, alignmentText: "    <<Alignment>>", ignoreChangeMarkers: true })

describe.skip("Properly align formatted code", () => {
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

  // TODO(Improve): If a whole line is deleted / added and to the other side we have a matching alignment, we could skip both. The bellow example can be compacted
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
      1
      <<Alignment>>
      print()
    `,
    expB: `
      <<Alignment>>

      print()
    `,
  });

  // TODO(Improve): Another example of compaction as mentioned above
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
      x
      <<Alignment>>
      2
    `,
    expB: `
      1
      <<Alignment>>

      2
    `
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
      1
      2
      3
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
    1x
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
      1
      2
      3
      console
      .
      log()
    `
  });

  test({
    name: "Case 13",
    a: `
      123


      x
    `,
    b: `

      x
      123
    `,
    expA: `
      <<Alignment>> 
      <<Alignment>> 
      123


      x
    `,
    expB: `

      x
      123
      <<Alignment>> 
      <<Alignment>> 
      <<Alignment>> 
    `
  })

  test({
    name: "Case 14",
    a: `
      ()
    `,
    b: `
      (

      )
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      ()
    `,
  })

  test({
    name: "Case 15",
    a: `
      (

      )
    `,
    b: `
      (


      )
    `,
    expA: `
      (
        
      <<Alignment>>
      )
    `,
  })

  test({
    name: 'Case 16',
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
    name: 'Case 17',
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
    name: 'Case 18',
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
    name: 'Case 19',
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
    name: "Case 20",
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
      ()
      start
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      end
    `,
    expB: `
      <<Alignment>>
      start
      (

      )
      end
    `
  })

  test({
    name: 'Case 21',
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
      ()
      x
      111
      222
      333
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      zz
    `,
    expB: `
      <<Alignment>>
      <<Alignment>>
      111
      222
      333
      (

      )
      x
      zz
    `
  })

  test({
    name: 'Case 22',
    a: `
      1 2
      x
    `,
    b: `
      1 2 x
    `,
    expB: `
      <<Alignment>>
      1 2 x
    `
  })

  // TODO: Another example of compression
  test({
    name: 'Case 23',
    a: `
      ()
    `,
    b: `
      (x)
    `,
  })

  test({
    name: 'Case 24',
    a: `
      1 2 3
    `,
    b: `
      1
      2
      3
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      1 2 3
    `,
  })

  // Testing the ignoring the push down of alignments
  test({
    name: 'Case 25',
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
      x z 1
    `,
    expB: `
      1

      x z
    `
  })

  test({
    name: "Case 26",
    a: `
      1 2 3
      x
    `,
    b: `
      x
      1
      2
      3
    `,
    expA: `
      <<Alignment>>
      <<Alignment>>
      <<Alignment>>
      1 2 3
      x
    `,
    expB: `
      x
      1
      2
      3
      <<Alignment>>
    `
  })

  test({
    name: 'Case 27',
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
      1
    `,
  })
})
