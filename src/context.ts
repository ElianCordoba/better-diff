import { Change } from "./change";
import { Iterator } from "./iterator";
import { TextAligner } from "./textAligner";
import { OffsetTracker } from "./offsetTracker";
import { ChangeType } from "./types";

export class Context {
  // Iterators will get stored once they are initialize, which happens later on the execution
  iterA!: Iterator;
  iterB!: Iterator;

  matches: Change<ChangeType.move>[] = [];
  offsetTracker = new OffsetTracker();
  textAligner = new TextAligner();

  constructor(
    public sourceA: string,
    public sourceB: string,
  ) {}
}
