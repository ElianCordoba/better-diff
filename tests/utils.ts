import { expect } from "vitest";

export function validateDiff(
  expectedA: string,
  expectedB: string,
  resultA: string,
  resultB: string,
) {
  function trimLines(text: string) {
    return text.split("\n").map((s) => s.trim()).join("");
  }

  expect(trimLines(resultA)).toEqual(trimLines(expectedA));
  expect(trimLines(resultB)).toEqual(trimLines(expectedB));
}
