import { OutputType, getDiff } from '../src'

import { readFileSync } from "node:fs"
import { Benchmark } from 'benchmark'
import { Mode } from '../src/types';
const suite = new Benchmark.Suite;

let a = readFileSync("./internal/diff/extreme1.ts", { encoding: "utf-8" });
let b = readFileSync("./internal/diff/extreme2.ts", { encoding: "utf-8" });

// add tests
suite
  // Too long
  // .add('Output text, debug mode', function () {
  //   getDiff(a, b)
  // })
  .add('Output noop, debug mode', function () {
    getDiff(a, b, { outputType: OutputType.noop })
  })
  .add('Output noop, release mode', function () {
    getDiff(a, b, { outputType: OutputType.noop, mode: Mode.release })
  })
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ 'async': true });