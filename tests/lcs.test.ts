import { describe, expect, test, vi } from "vitest";
import { getSequenceSingleDirection } from "../src/core/find_diffs";

class MockIterator {
  constructor(public items: any[]) {}

  peek(index: number) {
    return this.items[index];
  }
}

vi.mock("../src/iterator", () => {
  return {
    Iterator: (data: any) => new MockIterator(data),
  };
});

vi.mock("../src/utils", async () => {
  return {
    equals: (a: number, b: number) => a == b,
  };
});

describe("Properly calculate LCS", () => {
  test("Simple case", () => {
    const charsA = [1, 2, 3];
    const charsB = [1, 2];

    const iterA: any = new MockIterator(charsA);
    const iterB: any = new MockIterator(charsB);

    let lcs = getSequenceSingleDirection(iterA, iterB, 0, 0).bestSequence;

    expect(lcs).toBe(2);

    lcs = getSequenceSingleDirection(iterB, iterA, 0, 0).bestSequence;

    expect(lcs).toBe(2);
  });

  test("Simple case 2", () => {
    const charsA = [1, 2, 3, 5];
    const charsB = [1, 2, 3, 4];

    const iterA: any = new MockIterator(charsA);
    const iterB: any = new MockIterator(charsB);

    const lcs = getSequenceSingleDirection(iterA, iterB, 0, 0).bestSequence;

    expect(lcs).toBe(3);
  });
});
