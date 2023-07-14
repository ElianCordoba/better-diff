import { Diff } from "./data_structures/diff";
import { Iterator } from "./core/iterator";
import { TextAligner } from "./textAligner";
import { OffsetTracker } from "./alignment/offset_tracker";
import { ChangeType } from "./types";

export class Context {
  // Iterators will get stored once they are initialize, which happens later on the execution
  iterA!: Iterator;
  iterB!: Iterator;

  matches: Diff<ChangeType.move>[] = [];
  offsetTracker = new OffsetTracker();
  textAligner = new TextAligner();

  constructor(
    public sourceA: string,
    public sourceB: string,
  ) { }
}
