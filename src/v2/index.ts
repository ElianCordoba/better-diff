import { Context } from "./utils";
import { Side } from "../shared/language";
import { Iterator } from "./iterator";
import { Change, getSequence } from "./diff";
import { Sequence } from "./types";

export function getDiff2(sourceA: string, sourceB: string) {
  const changes: Change[] = [];

  const iterA = new Iterator(sourceA, Side.a);
  const iterB = new Iterator(sourceB, Side.b);

  // console.log('------------- A ----------')
  // iterA.nodes.map((x, i) => {
  //   console.log(i, "|", x.start, x.end, x.prettyKind, `"${x.text}"`)
  // })

  // console.log('------------- B ----------')
  // iterB.nodes.map((x, i) => {
  //   console.log(i, "|", x.start, x.end, x.prettyKind, `"${x.text}"`)
  // })

  _context = new Context(sourceA, sourceB);

  _context.iterA = iterA;
  _context.iterB = iterB;
  
  const sequences: Sequence[] = []

  // 1- For every node on B, we look for candidates on A
  for (const nodeB of iterB.nodes) {
    const aSideCandidates = iterA.getMatchingNodes(nodeB)

    if (aSideCandidates.length === 0) {
      // Report missing 
      console.log('Missing node found', nodeB.prettyKind, nodeB.text)
      continue
    }
    
    // 2- For every candidate we find their sequences and store them in the global sequence list
    for (const candidate of aSideCandidates) {
      const possibleSequences = getSequence(candidate, nodeB)

      sequences.push(possibleSequences)
    }
  }

  return sequences

  // 3- Sort the sequences by length
  // 4- For though all of them, checking if they are still applicable, if so record the move, otherwise skip it. (count matched nodes to skip early if possible)



  // const sortedSequences = sequences.sort((a,b) => {
  //   if (a.length < b.length) {
  //     return 1
  //   } else if (a.length > b.length) {
  //     return -1
  //   } else {
  //     return a.skips >= b.skips ? 1 : -1
  //   }
  // })

  // return sortedSequences

  // let matchedANodes = 0
  // let matchedBNodes = 0
  // for (const seq of sortedSequences) {
  //   if (!stillApplicable(seq)) {
  //     continue
  //   }

  //   const [matchedA, matchedB] = applySequence(seq)

  //   matchedANodes += matchedA
  //   matchedBNodes += matchedB

  //   if (iterA.nodes.length === matchedANodes) {
  //     // Report adds
  //   }

  //   if (iterB.nodes.length === matchedBNodes) {
  //     // Report dels
  //   }
  // }
}

export let _context: Context;
