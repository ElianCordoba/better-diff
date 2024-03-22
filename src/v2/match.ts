import { Segment } from "./types";

export class CandidateMatch {
  constructor(
    public segments: Segment[],
    public textLength: number,
    public skips = 0,
  ) {}

  static createEmpty() {
    return new CandidateMatch([], 0, 0);
  }

  isBetterThan(otherCandidate: CandidateMatch) {
    if (otherCandidate.textLength !== this.textLength) {
      return otherCandidate.textLength < this.textLength;
    }

    if (otherCandidate.segments.length !== this.segments.length) {
      return otherCandidate.segments.length < this.segments.length;
    }

    return otherCandidate.skips < this.skips;
  }

  draw() {
  }
}
