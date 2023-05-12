import { Change } from "./change";
import { Iterator } from "./iterator";
import { LineAlignments } from "./lineAlignments";
import { OffsetTracker } from "./offsetTracker";
import { ChangeType } from "./types";

// line number (one-based) -> line start position
type LineMapTable = Map<number, number>;

export class Context {
  // Iterators will get stored once they are initialize, which happens later on the execution
  iterA!: Iterator;
  iterB!: Iterator;

  lineMapNodeTable: { a: LineMapTable; b: LineMapTable } = { a: new Map(), b: new Map() };
  matches: Change<ChangeType.move>[] = [];
  offsetTracker = new OffsetTracker();
  lineAlignmentTracker = new LineAlignments();

  constructor(
    public sourceA: string,
    public sourceB: string,
  ) { }
}
