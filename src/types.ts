export enum Side {
  a = "a",
  b = "b",
}

export interface DiffResult {
  sourceA: string;
  sourceB: string;
}

export enum ChangeType {
  addition = "addition",
  deletion = "removal",
  move = "move",
}

export interface Range {
  start: number;
  end: number;
}

export enum MatchStatus {
  NotChecked, // no lo chekiamos todavia
  NotFound, // chekiamos pero no estaba
  Matched, // estaba y lo encontramos
}

export interface Candidate {
  index: number;
  expressionNumber: number;
}

export enum RenderInstruction {
  // No text decoration
  default = "default",

  // Text with color
  addition = "addition",
  deletion = "deletion",
  move = "move",
}

export interface SourceChunk {
  type: RenderInstruction;
  text: string;
  moveNumber: string;
}

// The type of each property is an array of arrays of chunks, where the first level represents a line in the source code and it's sub-arrays represent the chunks of code of that line:
//
// - Code: `
//   console.log(123)
//   return 1 + 2
// `
//
// - Server response:
// [
//   (line 1)
//   [
//     { text: "console.log(123)", type: RenderInstruction.default }
//   ],
//
//   (line 2)
//   [
//     { text: "return", type: RenderInstruction.default },
//     { text: "1 + 2", type: RenderInstruction.addition }
//   ],
// ]
export interface SerializedResponse {
  chunksA: SourceChunk[][];
  chunksB: SourceChunk[][];
}

// What the frontend sends
export interface GetDiffPayload {
  a: string;
  b: string;
}
