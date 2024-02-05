import { Context } from "./utils";
import { Side } from "../shared/language";
import { Iterator } from "./iterator";
import { Change, findBestSequence } from "./diff";

export function getDiff2(sourceA: string, sourceB: string) {
  const changes: Change[] = [];

  const iterA = new Iterator(sourceA, Side.a)
  const iterB = new Iterator(sourceB, Side.b)

  _context = new Context(sourceA, sourceB);

  _context.iterA = iterA;
  _context.iterB = iterB;

  let i = 0
  while (true) {
    const a = iterA.next()
    const b = iterB.next()

    // No more nodes to process. We are done
    if (!a && !b) {
      break
    }

    // One of the iterators ran out of nodes. We will mark the remaining unmatched nodes in the other iterator
    // as deletions or additions and exit.
    if (!a || !b) {
      break
    }

    findBestSequence(a, b)

  }
}

export let _context: Context;