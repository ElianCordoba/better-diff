import { describe, expect, test } from "vitest";
import { Range } from "../src/types";
import { tryMergeRanges } from "../src/change";

describe("Should detect range overlapping", () => {
  test("Case 1: Same range", () => {
    const rangeA: Range = {
      start: 1,
      end: 3,
    };

    const rangeB: Range = rangeA;

    expect(tryMergeRanges(rangeA, rangeB)).toEqual(rangeA);
  });

  test("Case 2: Overlap with different start and/or end", () => {
    const rangeA: Range = {
      start: 1,
      end: 3,
    };

    const rangeB: Range = {
      start: 2,
      end: 4,
    };

    expect(tryMergeRanges(rangeA, rangeB)).toEqual({
      start: 1,
      end: 4,
    });

    expect(tryMergeRanges(rangeB, rangeA)).toEqual({
      start: 1,
      end: 4,
    });
  });

  test("Case 3: No overlap", () => {
    const rangeA: Range = {
      start: 1,
      end: 3,
    };

    const rangeB: Range = {
      start: 4,
      end: 5,
    };

    expect(tryMergeRanges(rangeA, rangeB)).toEqual(undefined);

    expect(tryMergeRanges(rangeB, rangeA)).toEqual(undefined);
  });
});
