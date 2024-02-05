import { Node as TsNode } from 'typescript';
import { Node } from './node'
import { getSourceFile } from "../frontend/utils";

export function getAST(source: string) {
  const ast = getSourceFile(source);

  let i = 0;
  function walk(node: TsNode, parent: Node | undefined): Node {
    const isLeafNode = node.getChildCount() === 0;

    const newNode = new Node({
      id: i,
      kind: node.kind,
      // In typescript a non-leaf node contains as string the whole children text combined, so we ignore it
      text: isLeafNode ? node.getText() : '',
      parent
    })
    i++;

    if (!isLeafNode) {
      newNode.children = node.getChildren().map(x => walk(x, newNode));
    }

    return newNode
  }

  const newAst = walk(ast, undefined)

  return newAst
}