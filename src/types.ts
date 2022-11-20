import { Node } from './ts-util'

export interface DiffResult {
  sourceA: string;
  sourceB: string
}

export enum ChangeType {
  addition = 'addition',
  removal = 'removal',
  change = 'change',
  move = 'move'
}

export interface Range {
  start: number;
  end: number;
}

export interface Change {
  type: ChangeType;

  // Changes on source
  rangeA: Range | undefined;
  // Changes on revision
  rangeB: Range | undefined;
}

export interface Item {
  node: Node;
  matched: boolean;
}

enum MatchStatus {
  NotChecked, // no lo chekiamos todavia
  NotFound,   // chekiamos pero no estaba
  Matched     // estaba y lo encontramos
}