import { DiffType } from "../types";
import { Node } from "./node";

export type SyntaxKind = number;

export type NodesTable = Map<SyntaxKind, Node[]>;

export interface ParsedProgram {
  nodes: Node[];
  allNodes: Node[];
  nodesTable: NodesTable;
}
