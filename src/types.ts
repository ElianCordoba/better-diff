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

export interface Range {
  start: number;
  end: number;
}

export enum Mode {
  release,
  debug,
}
