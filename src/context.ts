import { MoveAlignmentInfo } from ".";
import { AlignmentTable } from "./alignmentTable";
import { Change } from "./change";
import { Iterator } from "./iterator";
import { OffsetTracker } from "./offsetTracker";

interface ContextValues {
  sourceA: string;
  sourceB: string;

  iterA: Iterator;
  iterB: Iterator;

  matches: Change[];
  offsetTracker: OffsetTracker;

  alignmentTable: AlignmentTable;
  alignmentsOfMoves: MoveAlignmentInfo[];
}

export class Context implements ContextValues {
  // Iterators will get stored once they are initialize, which happens later on the execution
  iterA!: Iterator;
  iterB!: Iterator;

  matches: Change[];
  offsetTracker: OffsetTracker;
  alignmentTable: AlignmentTable;
  alignmentsOfMoves: MoveAlignmentInfo[];

  constructor(
    public sourceA: string,
    public sourceB: string,
  ) {
    this.offsetTracker = new OffsetTracker();
    this.matches = [];
    this.alignmentTable = new AlignmentTable();
    this.alignmentsOfMoves = [];
  }
}
