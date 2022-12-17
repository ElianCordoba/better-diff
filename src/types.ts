import { Node } from "./node";

export interface DiffResult {
  sourceA: string;
  sourceB: string;
}

export enum ChangeType {
  addition = "addition",
  removal = "removal",
  change = "change",
  move = "move",
}

export interface Range {
  start: number;
  end: number;
}

export interface Item {
  node: Node;
  matched: boolean;
  matchNumber: number;
  index: number;
}

export enum MatchStatus {
  NotChecked, // no lo chekiamos todavia
  NotFound, // chekiamos pero no estaba
  Matched, // estaba y lo encontramos
}
