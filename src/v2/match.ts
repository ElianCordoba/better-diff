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
    if (this.textLength > otherCandidate.textLength) {
      return true;
    } else if (this.textLength < otherCandidate.textLength) {
      return false;
    }

    if (this.segments.length < otherCandidate.segments.length) {
      return true;
    } else if (this.segments.length > otherCandidate.segments.length) {
      return false;
    }

    return this.skips < otherCandidate.skips;
  }

  draw() {
  }
}
