import { describe, expect, test } from "vitest";
import { getNodesArray } from "../src/ts-util";
import { formatSyntaxKind } from "../src/utils";
import { Iterator } from "../src/iterator";

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

describe.skip("Should iterate over node list properly", () => {
  test("Simple advance", () => {
    const iter = new Iterator(aNodes);

    expect(formatSyntaxKind(iter.next()?.node!)).toBe("SyntaxList");
    iter.mark();

    expect(formatSyntaxKind(iter.next()?.node!)).toBe("VariableStatement");
    iter.mark();

    expect(formatSyntaxKind(iter.next()?.node!)).toBe(
      "VariableDeclarationList",
    );
    iter.mark();

    expect(formatSyntaxKind(iter.next()?.node!)).toBe("ConstKeyword");
    iter.mark();

    expect(formatSyntaxKind(iter.next()?.node!)).toBe("SyntaxList");
    iter.mark();

    expect(formatSyntaxKind(iter.next()?.node!)).toBe("VariableDeclaration");
    iter.mark();
  });

  test.only("Advance from non zero position", () => {
    const iter = new Iterator(aNodes);

    expect(formatSyntaxKind(iter.next(3)?.node!)).toBe("ConstKeyword");
    iter.mark();

    expect(formatSyntaxKind(iter.next(4)?.node!)).toBe("SyntaxList");
    iter.mark();

    expect(formatSyntaxKind(iter.next(5)?.node!)).toBe("VariableDeclaration");
    iter.mark();
  });

  test("Advance skipping matched nodes", () => {
    const iter = new Iterator(aNodes);

    iter.mark(1);
    iter.mark(3);
    iter.mark(4);

    expect(formatSyntaxKind(iter.next()?.node!)).toBe("SyntaxList");
    iter.mark();

    expect(formatSyntaxKind(iter.next()?.node!)).toBe(
      "VariableDeclarationList",
    );
    iter.mark();

    expect(formatSyntaxKind(iter.next()?.node!)).toBe("VariableDeclaration");
    iter.mark();
  });

  // TODO: Refactor and add more test to check for multiple matches
  test("Find nearby nodes", () => {
    const iter = new Iterator(aNodes);

    iter.mark(1);
    iter.mark(2);
    iter.mark(3);
    iter.mark(4);

    const expected = aNodes[0];

    const index = iter.getCandidates(expected)[0];

    expect(formatSyntaxKind(iter.items[index].node)).toBe(
      "SyntaxList",
    );
  });
});
