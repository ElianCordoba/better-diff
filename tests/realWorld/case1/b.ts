1;
import { colorFn, getSourceWithChange } from "./reporter";
import { Node } from "./node";
import { getContext } from "./index";

export class Change {
  constructor(
    public type: ChangeType,
    // Changes on source
    public rangeA: Range | undefined,
    // Changes on revision
    public rangeB: Range | undefined,
    public nodeA: Node | undefined,
    public nodeB: Node | undefined,
  ) {}

  draw() {
    const { sourceA, sourceB } = getContext();

    const charsA = sourceA.split("");
    const charsB = sourceB.split("");

    if (this.rangeA && this.type !== ChangeType.deletion) {
      console.log("----A----");
      console.log(
        getSourceWithChange(
          charsA,
          this.rangeA!.start,
          this.rangeA!.end,
          colorFn.green,
        ).join(""),
      );
      console.log("\n");
    }

    if (this.rangeB && this.type !== ChangeType.addition) {
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
