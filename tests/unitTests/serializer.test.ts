import { expect, test } from "vitest";
import { OutputType, getDiff } from "../../src";

test('Case 1', () => {
  const a = `
    console.log() && 3
  `.trim()

  const b = `
    fn(console.log(1))
  `.trim()

  const expected = {
    chunksA: [
      [
      ],
      [
        {
          text: "console.log() ",
          type: "default",
          moveNumber: "",
        },
        {
          text: "&& 3",
          type: "deletion",
          moveNumber: "",
        },
      ],
    ],

    chunksB: [
      [
      ],
      [
        {
          text: "fn(",
          type: "addition",
          moveNumber: "",
        },
        {
          text: "console.log(",
          type: "default",
          moveNumber: "",
        },
        {
          text: "1",
          type: "addition",
          moveNumber: "",
        },
        {
          text: ")",
          type: "default",
          moveNumber: "",
        },
        {
          text: ")",
          type: "addition",
          moveNumber: "",
        },
      ],
    ]
  }

  const result = getDiff(a, b, { outputType: OutputType.serializedChunks })

  expect(result).toEqual(expected)
})

test('Case 2', () => {
  const a = `
    if (true) {
      3; print
    }
  `.trim()

  const b = `
    z
    print; 3
    x
  `.trim()

  const expected = {
    chunksA: [
      [
        {
          text: "if (true) {",
          type: "deletion",
          moveNumber: "",
        },
        {
          text: "\n",
          type: "default",
          moveNumber: "",
        },
      ],
      [
        {
          text: "      ",
          type: "default",
          moveNumber: "",
        },
        {
          text: "3",
          type: "move",
          moveNumber: "6",
        },
        {
          text: ";",
          type: "deletion",
          moveNumber: "",
        },
        {
          text: " print\n",
          type: "default",
          moveNumber: "",
        },
      ],
      [
        {
          text: "    ",
          type: "default",
          moveNumber: "",
        },
        {
          text: "}",
          type: "deletion",
          moveNumber: "",
        },
      ],
    ],
    chunksB: [
      [
        {
          text: "z",
          type: "addition",
          moveNumber: "",
        },
        {
          text: "\n",
          type: "default",
          moveNumber: "",
        },
      ],
      [
        {
          text: "    print",
          type: "default",
          moveNumber: "",
        },
        {
          text: ";",
          type: "addition",
          moveNumber: "",
        },
        {
          text: " ",
          type: "default",
          moveNumber: "",
        },
        {
          text: "3",
          type: "move",
          moveNumber: "6",
        },
        {
          text: "\n",
          type: "default",
          moveNumber: "",
        },
      ],
      [
        {
          text: "    ",
          type: "default",
          moveNumber: "",
        },
        {
          text: "x",
          type: "addition",
          moveNumber: "",
        },
      ],
    ],
  }

  const result = getDiff(a, b, { outputType: OutputType.serializedChunks })

  expect(result).toEqual(expected)
})