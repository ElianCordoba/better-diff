

export enum DiffType {
  deletion = 1 << 0, // 1
  addition = 1 << 1, // 2
  move = 1 << 2, // 4
}

export const TypeMasks = {
  AddOrDel: DiffType.addition | DiffType.deletion,
  DelOrMove: DiffType.deletion | DiffType.move,
  AddOrMove: DiffType.addition | DiffType.move,
};

export interface NewDiffInfo {
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

// What the frontend sends
export interface GetDiffPayload {
  a: string;
  b: string;
}

export enum Mode {
  release,
  debug,
}
