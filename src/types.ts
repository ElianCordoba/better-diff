import { Node } from './ts-util'

export enum ChangeType {
  addition = 'addition',
  removal = 'removal',
  change = 'change'
}

export interface InitialChange {
  type: ChangeType;
  index: number;
  hint?: string;
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