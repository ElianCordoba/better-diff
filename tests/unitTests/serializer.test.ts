import { expect, test } from "vitest";
import { ServerResponse } from "../../src/types";
import { getTextWithDiffs } from "../../src";
import { serialize } from "../../src/serializer";

function getSerializedResults(a: string, b: string): ServerResponse {
  const { changes } = getTextWithDiffs(a, b);
  const serializedRed = serialize(a, b, changes)

  return serializedRed
}

test('', () => {
  const a = `
  console.log() && 3
`;

  const b = `
  fn(console.log())
`;

  const expected = {
    "chunksA": [
      [
        {
          "text": "",
          "type": "default",
          "start": 0,
          "end": 0,
        }
      ],
      [
        {
          "type": "default",
          "text": "\n  ",
          "start": 0,
          "end": 3,
        },
        {
          "type": "move",
          "text": "console.log()",
          "start": 3,
          "end": 16,
          "id": 5
        },
        {
          "type": "default",
          "text": " ",
          "start": 16,
          "end": 17,
        },
        {
          "type": "deletion",
          "text": "&&",
          "start": 17,
          "end": 19,
          "id": 6
        },
        {
          "type": "default",
          "text": " ",
          "start": 19,
          "end": 20,
        },
        {
          "type": "deletion",
          "text": "3",
          "start": 20,
          "end": 21,
          "id": 7
        }
      ],
      [
        {
          "text": "",
          "type": "default",
          "start": 0,
          "end": 0,
        }
      ]
    ],
    "chunksB": [
      [
        {
          "text": "",
          "type": "default",
          "start": 0,
          "end": 0,
        }
      ],
      [
        {
          "type": "default",
          "text": "\n  ",
          "start": 0,
          "end": 3,
        },
        {
          "type": "addition",
          "text": "fn(",
          "start": 3,
          "end": 6,
          "id": 6
        },
        {
          "type": "move",
          "text": "console.log()",
          "start": 6,
          "end": 19,
          "id": 5
        },
        {
          "type": "addition",
          "text": ")",
          "start": 19,
          "end": 20,
          "id": 8
        }
      ],
      [
        {
          "text": "",
          "type": "default",
          "start": 0,
          "end": 0,
        }
      ]
    ]
  }

  const result = getSerializedResults(a, b)

  expect(result).toEqual(expected)
})

