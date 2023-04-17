export enum Side {
  a = "a",
  b = "b",
}

export interface DiffResult {
  sourceA: string;
  sourceB: string;
}

export enum ChangeType {
  deletion = 1 << 0, // 1
  addition = 1 << 1, // 2
  move = 1 << 2, // 4
}

export type SyntaxKind = number;

// A table with the syntax kind as the key an a set of indexes where an _unmatched_ node with that kind is found. Nodes get removed from the table as they get marked
export type KindTable = Map<SyntaxKind, Set<number>>;

export const TypeMasks = {
  AddOrDel: ChangeType.addition | ChangeType.deletion,
  DelOrMove: ChangeType.deletion | ChangeType.move,
  AddOrMove: ChangeType.addition | ChangeType.move,
};

export interface NewChangeInfo {
  index: number;
  range: Range;
}

export interface Range {
  start: number;
  end: number;
}

export enum RenderInstruction {
  // No text decoration
  default = "default",

  // TODO: This is not being used right now, we should send the frontend this information that the rendering is easier

  // Render blank line
  alignment = "alignment",

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

export enum Mode {
  release,
  debug,
}
