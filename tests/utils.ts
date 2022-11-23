import { expect } from "vitest";

export function validateDiff(
  expectedA: string,
  expectedB: string,
  resultA: string,
  resultB: string,
) {
  expect(resultA.trim()).toEqual(expectedA.trim());
  expect(resultB.trim()).toEqual(expectedB.trim());
}
