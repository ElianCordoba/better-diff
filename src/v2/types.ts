import { Node } from "./node";

export type SyntaxKind = number;

export type NodesTable = Map<SyntaxKind, Node[]>;

export interface ParsedProgram {
  ast: Node;
  nodesTable: NodesTable;
}
