import { SyntaxKind, Node as TsNode } from "typescript";
import { Node } from "./node";
import { getSourceFile } from "../frontend/utils";
import { Side } from "../shared/language";
import { NodesTable, ParsedProgram } from "./types";

export function getTsNodes(source: string, side: Side): ParsedProgram {
  const ast = getSourceFile(source);

  const nodes: Node[] = [];
  const allNodes: Node[] = [];

  const nodesTable: NodesTable = new Map();

  let i = 0;
  function walk(node: TsNode, parent: Node | undefined): Node {
    const isLeafNode = node.getChildCount() === 0;

    // Each node owns the trivia before until the previous token, for example:
    //
    // age = 24
    //      ^
    //      Trivia for the number literal starts here, but you don't want to start the diff here
    //
    // This is why we add the leading trivia to the `start` of the node, so we get where the actual
    // value of the node starts and not where the trivia starts
    const start = node.pos + node.getLeadingTriviaWidth();
    const end = node.end;

    const isTextNode = verifyTextNode(node)

    const newNode = new Node({
      side,
      index: nodes.length,
      globalIndex: i,
      kind: node.kind,
      // In typescript a non-leaf node contains as string the whole children text combined, so we ignore it
      text: isTextNode ? node.getText() : "",
      start,
      end,
      parent,
      isTextNode
    });
    i++;

    allNodes.push(newNode)

    if (isTextNode) {
      nodes.push(newNode)
    }
    
    

    storeNodeInNodeTable(nodesTable, newNode);
  
    node.getChildren().map((x) => walk(x, newNode));
  
    return newNode;
  }

  walk(ast, undefined);

  return {
    nodesTable,
    nodes,
    allNodes
  };
}


function verifyTextNode(node: TsNode) {
  const isReservedWord = node.kind >= SyntaxKind.FirstKeyword && node.kind <= SyntaxKind.LastKeyword;
  const isPunctuation = node.kind >= SyntaxKind.FirstPunctuation && node.kind <= SyntaxKind.LastPunctuation;

  return (node as any).text && node.kind !== SyntaxKind.SourceFile || isReservedWord || isPunctuation
}

function storeNodeInNodeTable(nodesTable: NodesTable, node: Node) {
  const currentValue = nodesTable.get(node.kind);

  if (currentValue) {
    currentValue.push(node);
  } else {
    nodesTable.set(node.kind, [node]);
  }
}
