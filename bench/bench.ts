import { getDiff, OutputType } from "../src";

import { readFileSync } from "node:fs";
import Benchmark from "benchmark";
import { Mode } from "../src/types";
const suite = new Benchmark.Suite();

// For a stress test use "./internal/diff/extreme1"
const a = readFileSync("./tests/realWorld/case1/a.ts", { encoding: "utf-8" });
const b = readFileSync("./tests/realWorld/case1/b.ts", { encoding: "utf-8" });

suite
  // Too long
  .add('Output text, debug mode', function () {
    getDiff(a, b)
  })
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
