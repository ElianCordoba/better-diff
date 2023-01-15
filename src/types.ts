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

// The results it's an array of arrays, the first level is for each line, the next level is for chunks of each line
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
export interface SourceChunk {
  type: RenderInstruction;
  text: string;
  moveNumber: string
}

export interface SerializedResponse {
  chunksA: SourceChunk[][];
  chunksB: SourceChunk[][];
}
