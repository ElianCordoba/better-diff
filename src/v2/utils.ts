import { Iterator } from "./iterator";

export class Context {
  // Iterators will get stored once they are initialize, which happens later on the execution
  iterA!: Iterator;
  iterB!: Iterator;

  constructor(
    public sourceA: string,
    public sourceB: string,
  ) { }
}
