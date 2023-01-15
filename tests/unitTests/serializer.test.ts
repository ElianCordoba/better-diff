// import { expect, test } from "vitest";
// import { SerializedResponse, SourceChunk2 } from "../../src/types";
// import { getTextWithDiffs } from "../../src";
// import { serialize2 } from "../../src/serializer";

// function validateSerializedResult(a: string, b: string, result: SerializedResponse) {
//   function validate(chunks: SourceChunk2[][], source: string) {
//     let hasError = false;
//     loop: for (const line of chunks) {
//       for (const { start, end, text } of line) {
//         const expected = source.slice(start, end);

//         if (expected !== text) {
//           hasError = true;
//           break loop;
//         }
//       }
//     }

//     return hasError;
//   }

//   const hasErrorOnA = validate(result.chunksA, a);
//   const hasErrorOnB = validate(result.chunksB, b);

//   expect(hasErrorOnA).toBe(false);
//   expect(hasErrorOnB).toBe(false);
// }

// interface SerializeTestInput {
//   name: string;
//   a: string;
//   b: string;
// }

// function validateSerializer({ name, a, b }: SerializeTestInput) {
//   test(name, () => {
//     const changes = getTextWithDiffs(a, b).changes;
//     const serializedResult = serialize2(a, b, changes);

//     validateSerializedResult(a, b, serializedResult);
//   });

//   test(name, () => {
//     const changes = getTextWithDiffs(b, a).changes;
//     const serializedResult = serialize2(b, a, changes);

//     validateSerializedResult(b, a, serializedResult);
//   });
// }

// validateSerializer({
//   name: "1",
//   a: `
//   console.log() && 3
//   `,
//   b: `
//   fn(console.log())
//   `,
// });

// validateSerializer({
//   name: "2",
//   a: `
//     x
//     console.log(0)
//   `,
//   b: `
//     console.log(1)
//     x
//     z
//   `,
// });

// validateSerializer({
//   name: "2",
//   a: `
//   while(true) {
//     console.log()
//   }
//   `,
//   b: `
//   console.log()`,
// });
