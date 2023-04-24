import { getDiff, OutputType } from "../src";

const a = `
  while (true) {
    fn()
  }
`

const b = `
  fn()
`

// Or you can read the code from files
// const a = readFileSync("./etc/fileA.ts", { encoding: "utf-8" });
// const b = readFileSync("./etc/fileB.ts", { encoding: "utf-8" });

const diff = getDiff(a, b, { outputType: OutputType.prettyText });

console.log("Source:");
console.log(diff.sourceA);

console.log("Revision:");
console.log(diff.sourceB);