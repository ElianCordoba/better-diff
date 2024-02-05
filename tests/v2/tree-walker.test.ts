import { expect, test } from "vitest";
import { Iterator } from "../../src/v2/iterator";
import { Side } from "../../src/shared/language";

const source = "1 + (2 + 3)"
const expectedNodes = [
  "SourceFile",
  "SyntaxList",
  "ExpressionStatement",
  "BinaryExpression",
  "NumericLiteral",
  "PlusToken",
  "ParenthesizedExpression",
  "OpenParenToken",
  "BinaryExpression",
  "NumericLiteral",
  "PlusToken",
  "NumericLiteral",
  "CloseParenToken",
  "EndOfFileToken",
];

test("Ensure the tree walker visits all nodes in order", () => {
  const iter = new Iterator(source, Side.a)

  // Prime the walker so that we skip the "SourceFile", we will use that to detect when the iteration start over
  const nodes: string[] = [iter.next()!.prettyKind]

  while (true) {
    const next = iter.next()!.prettyKind

    if (next === 'SourceFile') {
      break
    }

    nodes.push(next)
  }

  expect(nodes).toMatchObject(expectedNodes);
});

test("Ensure the tree walker visits all nodes by passing one node that the time", () => {
  const iter = new Iterator(source, Side.a)

  const nodes: string[] = []

  const one = iter.next();
  nodes.push(one!.prettyKind)
  const two = iter.next(one);
  nodes.push(two!.prettyKind)
  const three = iter.next(two);
  nodes.push(three!.prettyKind)
  const four = iter.next(three);
  nodes.push(four!.prettyKind)
  const five = iter.next(four);
  nodes.push(five!.prettyKind)
  const six = iter.next(five);
  nodes.push(six!.prettyKind)
  const seven = iter.next(six);
  nodes.push(seven!.prettyKind)
  const eight = iter.next(seven);
  nodes.push(eight!.prettyKind)
  const nine = iter.next(eight);
  nodes.push(nine!.prettyKind)
  const ten = iter.next(nine);
  nodes.push(ten!.prettyKind)
  const eleven = iter.next(ten);
  nodes.push(eleven!.prettyKind)
  const twelve = iter.next(eleven);
  nodes.push(twelve!.prettyKind)
  const thirteen = iter.next(twelve);
  nodes.push(thirteen!.prettyKind)
  const fourteen = iter.next(thirteen);
  nodes.push(fourteen!.prettyKind)

  expect(nodes).toMatchObject(expectedNodes);
});

test("Ensure the tree walker loops back after visiting all the nodes", () => {
  const iter = new Iterator(source, Side.a)

  let lastNode;

  let i = 0;
  while (i < expectedNodes.length) {
    lastNode = iter.next()
    i++
  }

  const shouldBeFirstNode = iter.next()!.prettyKind

  expect(shouldBeFirstNode).toBe(expectedNodes[0])
});

test("Ensure the tree walker ignores matched nodes", () => {
  const iter = new Iterator(source, Side.a)

  // Given the full node list, lets ignore the following
  const expectedNodes2 = [
    //"SourceFile",               // index 0, root node
    "SyntaxList",
    "ExpressionStatement",
    "BinaryExpression",
    "NumericLiteral",
    "PlusToken",
    "ParenthesizedExpression",
    //"OpenParenToken",          // index 7, has siblings
    "BinaryExpression",
    "NumericLiteral",
    "PlusToken",
    //"NumericLiteral",          // index 11, last sibling
    "CloseParenToken",
    "EndOfFileToken",
  ];

  const nodesToMatch = [0, 7, 11]

  // First pass over the node to mark a few as matched
  while (true) {
    const node = iter.next()!

    if (nodesToMatch.includes(node.id)) {
      console.log(node.prettyKind)
      node.mark()
    }

    if (node.prettyKind === "EndOfFileToken") break
  }

  const nodes = []
  // Second pass to gather the non-matched nodes
  while (true) {
    const node = iter.next()!

    nodes.push(node)

    if (node.prettyKind === "EndOfFileToken") break
  }

  expect(nodes.length).toBe(expectedNodes2.length)

});