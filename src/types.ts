import { Node } from './ts-util'

export enum ChangeType {
  addition = 'addition',
  removal = 'removal',
  change = 'change'
}

export interface Range {
  start: number;
  end: number;
}

export interface Change {
  type: ChangeType;
  index?: number;

  // Changes on source
  rangeA: Range | undefined;
  // Changes on revision
  rangeB: Range | undefined;

  hint?: string;
  text?: string
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