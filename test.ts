import { getSimplifiedDiff } from "./src";

const sourceA = `
`;

const sourceB = `
  11
  2
`;

const [result, changes] = getSimplifiedDiff(sourceA, sourceB);

console.log(changes.map((x) => ({ a: x.rangeA, b: x.rangeB })));

console.log(`\n`);
console.log("Source:");
console.log(result.sourceA);

console.log("---------------------------------------------");

console.log("Revision:");
console.log(result.sourceB);
console.log(`\n`);
