import { DiffType } from "../types";
import { Change } from "./diff";
import { Node } from "./node";

export type SyntaxKind = number;

export type NodesTable = Map<SyntaxKind, Node[]>;

export interface ParsedProgram {
  nodes: Node[];
  allNodes: Node[];
  nodesTable: NodesTable;
}

export interface Options<_OutputType extends OutputType = OutputType.changes> {
  outputType: _OutputType;
}

export enum OutputType {
  changes,
  text,
  prettyText,
}

export interface ResultTypeMapper {
  [OutputType.changes]: Change[];
  [OutputType.text]: { sourceA: string; sourceB: string };
  [OutputType.prettyText]: { sourceA: string; sourceB: string };
}
