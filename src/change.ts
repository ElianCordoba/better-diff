import { ChangeType, Range } from "./types";
import { colorFn, getSourceWithChange } from "./reporter";
import { Node } from "./node";

export class Change {
  constructor(
    public type: ChangeType,
    // Changes on source
    public rangeA: Range | undefined,
    // Changes on revision
    public rangeB: Range | undefined,
    // For debugging porpoises, maybe remove in the future
    public nodeA: Node | undefined,
    public nodeB: Node | undefined,
  ) { }

  draw(charsA: string[], charsB: string[]) {
    if (this.rangeA) {
      console.log("----A----");
      console.log(
        getSourceWithChange(
          charsA,
          this.rangeA.start,
          this.rangeA.end,
          colorFn.green,
        ).join(""),
      );
      console.log("\n");
    }

    if (this.rangeB) {
      console.log("----B----");
      console.log(
        getSourceWithChange(
          charsB,
          this.rangeB.start,
          this.rangeB.end,
          colorFn.green,
        ).join(""),
      );
      console.log("\n");
    }
  }
}
