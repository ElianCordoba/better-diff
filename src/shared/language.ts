// This file contains interfaces and types that abstract the implementation of parsers from the core logic, which is language-agnostic

import { Node } from "../node";
import { KindTable, Side } from "../types";

export interface ParsedProgram {
  nodes: Node[];
  kindTable: KindTable;
  side: Side;
}