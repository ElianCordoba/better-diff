import { getDiff, OutputType } from "../src";

import { readFileSync } from "node:fs";
import Benchmark from "benchmark";
import { Mode } from "../src/types";
const suite = new Benchmark.Suite();

const a = readFileSync("./internal/diff/extreme1.ts", { encoding: "utf-8" });
const b = readFileSync("./internal/diff/extreme2.ts", { encoding: "utf-8" });

// add tests
suite
  // Too long
  // .add('Output text, debug mode', function () {
  //   getDiff(a, b)
  // })
  .add("Output noop, debug mode", function () {
    getDiff(a, b, { outputType: OutputType.noop });
  })
  .add("Output noop, release mode", function () {
    getDiff(a, b, { outputType: OutputType.noop, mode: Mode.release });
  })
  // deno-lint-ignore no-explicit-any
  .on("cycle", function (event: any) {
    console.log(String(event.target));
  })
  // deno-lint-ignore no-explicit-any
  .on("complete", function (this: any) {
    console.log("Fastest is " + this.filter("fastest").map("name"));
  })
  .run({ "async": true });
