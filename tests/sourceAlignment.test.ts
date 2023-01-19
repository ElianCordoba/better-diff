import { describe, expect, test } from "vitest";
import { getTextWithDiffs } from "../src";
import { getSequenceLength } from "../src/main";
import { getAlignedSources } from "../src/reporter";
import { validateDiff } from "./utils";

// describe("Align source after diffing", () => {
//   test("Align after removal", () => {
//     const a = `
//       x
//       a
//     `;

//     const b = `
//       x
//     `;

//     const expectedA = a;
//     const expectedB = `
//       x
//       <<Alignment>>
//     `;

//     const { changes } = getTextWithDiffs(a, b);

//     const { a: resultA, b: resultB } = getAlignedSources(a, b, changes, "<<Alignment>>");

//     validateDiff(expectedA, expectedB, resultA, resultB);
//   });

//   test("Align before removal", () => {
//     const a = `
//       a
//       x
//     `;

//     const b = `
//       x
//     `;

//     const expectedA = a;
//     const expectedB = `
//       <<Alignment>>
//       x
//     `;

//     const { changes } = getTextWithDiffs(a, b);

//     const { a: resultA, b: resultB } = getAlignedSources(a, b, changes, "<<Alignment>>");

//     validateDiff(expectedA, expectedB, resultA, resultB);
//   });

//   test("Align after addition", () => {
//     const a = `
//       x
//     `;

//     const b = `
//       x
//       a
//     `;

//     const expectedA = `
//       x
//       <<Alignment>>
//     `;
//     const expectedB = b;

//     const { changes } = getTextWithDiffs(a, b);

//     const { a: resultA, b: resultB } = getAlignedSources(a, b, changes, "<<Alignment>>");

//     validateDiff(expectedA, expectedB, resultA, resultB);
//   });

//   test("Align before addition", () => {
//     const a = `
//       x
//     `;

//     const b = `
//       a
//       x
//     `;

//     const expectedA = `
//       <<Alignment>>
//       x
//     `;
//     const expectedB = b;

//     const { changes } = getTextWithDiffs(a, b);

//     const { a: resultA, b: resultB } = getAlignedSources(a, b, changes, "<<Alignment>>");

//     validateDiff(expectedA, expectedB, resultA, resultB);
//   });

//   test("Align move. Case 1", () => {
//     const a = `
//       x
//       z
//     `;

//     const b = `
//       x
//       1
//       2
//       z
//     `;

//     const expectedA = `
//       x
//       <<Alignment>>
//       <<Alignment>>
//       z
//     `;
//     const expectedB = b;

//     const { changes } = getTextWithDiffs(a, b);

//     const { a: resultA, b: resultB } = getAlignedSources(a, b, changes, "<<Alignment>>");

//     validateDiff(expectedA, expectedB, resultA, resultB);
//   });

//   // TODO: https://github.com/ElianCordoba/better-diff/issues/19
//   test.skip("Align move. Case 2", () => {
//     const a = `
//       x
//       1
//       2
//     `;

//     const b = `
//       x
//       z
//     `;

//     const expectedA = `
//       x
//       1
//       2
//       <<Alignment>>
//     `;

//     const expectedB = `
//       x
//       <<Alignment>>
//       <<Alignment>>
//       z
//     `;

//     const { changes } = getTextWithDiffs(a, b);

//     const { a: resultA, b: resultB } = getAlignedSources(a, b, changes, "<<Alignment>>");

//     validateDiff(expectedA, expectedB, resultA, resultB);
//   });

//   // TODO: https://github.com/ElianCordoba/better-diff/issues/19
//   test.skip("Align invisible move", () => {
//     const a = `
//       x
//       if (true) {}  
//       z
//     `;

//     const b = `
//       x
//       if (
//         true
//       ) {
    
//       }
//       z
//     `;

//     const expectedA = `
//       x
//       if (true) {}
//       <<Alignment>>
//       <<Alignment>>
//       <<Alignment>>
//       <<Alignment>>
//       z
//     `;

//     const expectedB = `
//       x
//       if (
//         true
//       ) {
    
//       }
//       z
//     `;

//     const { changes } = getTextWithDiffs(a, b);

//     const { a: resultA, b: resultB } = getAlignedSources(a, b, changes, "<<Alignment>>");

//     validateDiff(expectedA, expectedB, resultA, resultB);
//   });

//   // TODO: https://github.com/ElianCordoba/better-diff/issues/19
//   // let a = `
//   //   1
//   //   finale
//   //   x
//   //   y
//   // `;

//   // let b = `
//   //   1
//   //   \`
//   //     1
//   //   \`
//   //   finale
//   //   z
//   //   y
//   // `;
// });

