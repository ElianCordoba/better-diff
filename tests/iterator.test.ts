import { describe, expect, test } from "vitest";
import { getNodesArray } from "../src/ts-util";
import { formatSyntaxKind } from "../src/utils";
import { NodeIterator } from '../src/iterator'

const aSource = `
  const num = 10

  function multiply(number, multiplier) {
    return number * multiplier
  }

  multiply(num, 5)
`;

const aNodes = getNodesArray(aSource);

// 0 SyntaxList
// 1 VariableStatement
// 2 VariableDeclarationList
// 3 ConstKeyword
// 4 SyntaxList
// 5 VariableDeclaration

describe("Should iterate over node list properly", () => {
  test("Simple advance", () => {
    const iter = new NodeIterator(aNodes);

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe("SyntaxList");
    iter.markMatched();

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe("VariableStatement");
    iter.markMatched();

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe(
      "VariableDeclarationList",
    );
    iter.markMatched();

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe("ConstKeyword");
    iter.markMatched();

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe("SyntaxList");
    iter.markMatched();

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe("VariableDeclaration");
    iter.markMatched();
  });

  test("Advance skipping matched nodes", () => {
    const iter = new NodeIterator(aNodes);

    iter.markMatched(1);
    iter.markMatched(3);
    iter.markMatched(4);

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe("SyntaxList");
    iter.markMatched();

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe(
      "VariableDeclarationList",
    );
    iter.markMatched();

    expect(formatSyntaxKind(iter.next()?.node.kind!)).toBe("VariableDeclaration");
    iter.markMatched();
  });

  test("Find nearby token", () => {
    const iter = new NodeIterator(aNodes);

    iter.markMatched(1);
    iter.markMatched(2);
    iter.markMatched(3);
    iter.markMatched(4);

    const expected = aNodes[0];

    expect(formatSyntaxKind(iter.nextNearby(expected, 5)!.node.kind)).toBe(
      "SyntaxList",
    );
  });
});
