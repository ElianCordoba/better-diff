import { ChangeType, Range } from "./types";
import { colorFn, getSourceWithChange } from "./reporter";
import { Node } from "./node";
import { getContext } from "./index";

export class Change {
  rangeA: Range | undefined;
  rangeB: Range | undefined;

  constructor(
    public type: ChangeType,
    public nodeA: Node | undefined,
    public nodeB: Node | undefined,

    // Changes on source
    rangeA?: Range,
    // Changes on revision
    rangeB?: Range,
  ) {
    this.rangeA = rangeA ?? nodeA?.getPosition()
    this.rangeB = rangeB ?? nodeB?.getPosition()
  }

  draw() {
    const { sourceA, sourceB } = getContext();

    const charsA = sourceA.split("");
    const charsB = sourceB.split("");

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
