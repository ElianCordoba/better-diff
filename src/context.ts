import { Change } from "./change";
import { Iterator } from "./iterator";
import { OffsetTracker } from "./offsetTracker";
import { ChangeType } from "./types";

// line number (1 based) -> node end
type LineMapTable = Map<number, number>

export class Context {
  // Iterators will get stored once they are initialize, which happens later on the execution
  iterA!: Iterator;
  iterB!: Iterator;

  lineMapNodeTable: { a: LineMapTable, b: LineMapTable } = { a: new Map(), b: new Map() }
  matches: Change<ChangeType.move>[];
  offsetTracker: OffsetTracker;

  constructor(
    public sourceA: string,
    public sourceB: string,
  ) {
    this.offsetTracker = new OffsetTracker();
    this.matches = [];
  }
}
