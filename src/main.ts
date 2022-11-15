import { getNodesArray, Node } from "./ts-util";
import { InitialChange, ChangeType, Item } from "./types";
import { equals, formatSyntaxKind } from "./utils";


export function getInitialDiffs(codeA: string, codeB: string) {
  const nodesA = getNodesArray(codeA)
  const nodesB = getNodesArray(codeB)

  const changes: InitialChange[] = []

  const maxLength = Math.max(nodesA.length, nodesB.length)
  const minLength = Math.min(nodesA.length, nodesB.length)

  let cursor = 0;
  let offset = 1

  function tryMatch(expected: Node) {
    const MAX_OFFSET = 10;

    const ahead = nodesB[cursor + offset]
    const back = nodesB[cursor - offset]

    if (equals(expected, ahead)) {

    } else if (equals(expected, back)) {

    }

    offset++

    if (offset >= MAX_OFFSET) {
      return
    }
  }


  // Step 2.1

  while (cursor < minLength) {
    const a = nodesA[cursor]
    const b = nodesB[cursor]

    // a == b delete both from array

    if (!equals(a, b)) {
      // changes.push({
      //   type: ChangeType.change, index: cursor, hint: getChangeHint(a, b)
      // })

      tryMatch(a)
    }

    cursor++
  }

  // Step 2.2

  const lengthDiff = nodesA.length - nodesB.length

  const typeOfChange = lengthDiff > 0 ? ChangeType.addition : ChangeType.removal

  while (cursor < maxLength) {
    changes.push({ type: typeOfChange, index: cursor })
    cursor++
  }

  if (cursor != maxLength) {
    console.log('oops')
  }

  return changes
}



//console.log(getInitialDiffs(aNodes, bNodes))

function getChangeHint(nodeA: Node, nodeB: Node) {
  const aString = `A (${formatSyntaxKind(nodeA.kind)}) ${nodeA.text ? nodeA.text : ''}`
  const bString = `B (${formatSyntaxKind(nodeB.kind)}) ${nodeB.text ? nodeB.text : ''}`
  return `${aString} -> ${bString}`;
}

