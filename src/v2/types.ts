import { DiffType } from "../types";
import { Node } from "./node";

export type SyntaxKind = number;

export type NodesTable = Map<SyntaxKind, Node[]>;

export interface ParsedProgram {
  nodes: Node[]
  allNodes: Node[]
  nodesTable: NodesTable;
}

// Start is inclusive, end is not inclusive
export type SegmentRange = [startIndex: number, endIndex: number]

export interface Segment {
  type: DiffType;
  a: SegmentRange;
  b: SegmentRange;
}

// TODO: Use a better way to store this
export interface Sequence {
  starterNode: Node;
  length: number;
  skips: number;
  segments: Segment[]
}