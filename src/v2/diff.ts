import { DiffType } from "../types";
import { Node } from './node'

interface ChangeSegment {
  type: DiffType;
  start: Node
  end: Node
}

export class Change {
  type: DiffType
  segments: ChangeSegment[]

  constructor(type: DiffType, segments: ChangeSegment[]) {
    this.type = type
    this.segments = segments
  }
}

export function findBestSequence(a: Node, b: Node) {

}