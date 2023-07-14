// This file contains interfaces and types that abstract the implementation of parsers from the core logic, which is language-agnostic

import { Node } from "../data_structures/node";

export interface ParsedProgram {
  nodes: Node[];
  kindTable: KindTable;
  side: Side;
}

export enum Side {
  a = "a",
  b = "b",
}


type SyntaxKind = number;

// A table with the syntax kind as the key an a set of indexes where an _unmatched_ node with that kind is found. Nodes get removed from the table as they get marked
export type KindTable = Map<SyntaxKind, Set<number>>;