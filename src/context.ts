import { Diff } from "./data_structures/diff";
import { Iterator } from "./core/iterator";
import { TextAligner } from "./alignment/text_aligner";
import { SemanticAligner } from "./alignment/semantic_aligner";
import { DiffType } from "./types";

export class Context {
  // Iterators will get stored once they are initialize, which happens later on the execution
  iterA!: Iterator;
  iterB!: Iterator;

  matches: Diff<DiffType.move>[] = [];
  semanticAligner = new SemanticAligner();
  textAligner = new TextAligner();

  constructor(
    public sourceA: string,
    public sourceB: string,
  ) {}
}
