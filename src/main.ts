import { getNodesArray, Node, ts } from "./ts-util";
import { formatSyntaxKind } from "./utils";

const aSource = `
  const num = 10

  function multiply(number, multiplier) {
    return number * multiplier
  }

  multiply(num, 5)
`

const bSource = `
  const num = 15

  function multiply(number, multiplier) {
    function identity(x) {
      return x
    }
    return identity(number) * multiplier
  }

  multiply(num, 5)
`

// Step 1

const aNodes = getNodesArray(aSource)
aNodes.map(x => console.log(formatSyntaxKind(x.kind)))

process.exit()
const bNodes = getNodesArray(bSource)

// Step 2

enum ChangeType {
  addition = 'addition',
  removal = 'removal',
  change = 'change'
}

interface InitialChange {
  type: ChangeType;
  index: number;
  hint?: string;
}

function getInitialDiffs(aList: Node[], bList: Node[]) {
  const changes: InitialChange[] = []

  const maxLength = Math.max(aList.length, bList.length)
  const minLength = Math.min(aList.length, bList.length)

  let cursor = 0;
  let offset = 1

  function tryMatch(expected: Node) {
    const MAX_OFFSET = 10;

    const ahead = bList[cursor + offset]
    const back = bList[cursor - offset]

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
    const a = aList[cursor]
    const b = bList[cursor]

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

  const lengthDiff = aList.length - bList.length

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


enum MatchStatus {
  NotChecked, // no lo chekiamos todavia
  NotFound,   // chekiamos pero no estaba
  Matched     // estaba y lo encontramos
}


export interface Item {
  node: Node;
  matched: boolean;
  index: number
  lastNode?: boolean
}

export function* nodeListIterator(nodeList: Node[]): Generator<Node> {
  const items: Item[] = nodeList.map(x => ({ node: x, matched: false }))

  let cursor = 0;
  let matchedNodesCount = 0

  function completed() {
    return matchedNodesCount === items.length
  }

  function nextNode() {
    const currentNode = items[cursor]

    if (currentNode.matched) {
      cursor++
      nextNode()
    }

    return currentNode
  }

  function markMatched() {
    items[cursor].matched = true;
    matchedNodesCount++
    cursor++
  }

  while (!completed()) {
    const matched = yield nextNode().node

    if (matched) {
      markMatched()
    }
  }
}



const itA = new NodeIterator(aNodes);

// Advance test
// console.log(formatSyntaxKind(itA.next().kind))
// console.log(formatSyntaxKind(itA.next().kind))
// itA.markMatched()
// console.log(formatSyntaxKind(itA.next().kind))
// itA.markMatched()
// console.log(formatSyntaxKind(itA.next().kind))
// itA.markMatched()
// console.log(formatSyntaxKind(itA.next().kind))
// itA.markMatched()
// console.log(formatSyntaxKind(itA.next().kind))

// Lista



// nerby test
itA.markMatched(1)
itA.markMatched(3)
itA.markMatched(4)

console.log(formatSyntaxKind(itA.next().kind))
itA.markMatched()
console.log(formatSyntaxKind(itA.next().kind))
itA.markMatched()
console.log(formatSyntaxKind(itA.next().kind))
itA.markMatched()
console.log(formatSyntaxKind(itA.next().kind))




// console.log(formatSyntaxKind(aNodes[0].kind))
// console.log(formatSyntaxKind(aNodes[1].kind))
// console.log(formatSyntaxKind(aNodes[2].kind))
// console.log(formatSyntaxKind(aNodes[3].kind))
// console.log(formatSyntaxKind(aNodes[4].kind))
// console.log(formatSyntaxKind(aNodes[5].kind))

// SyntaxList
// VariableStatement
// VariableDeclarationList
// ConstKeyword
// SyntaxList
// VariableDeclaration

// const it = nodeListIterator(aNodes);

// console.log(formatSyntaxKind(it.next().value.kind))
// console.log(formatSyntaxKind(it.next(1).value.kind))
// console.log(formatSyntaxKind(it.next(2).value.kind))
// console.log(formatSyntaxKind(it.next(3).value.kind))
// console.log(formatSyntaxKind(it.next(4).value.kind))



/*

  a = Ait.getNext
  b = Ait.getNext

  a = b
    Ait.markMatched
    Bit.markMatched

  a != b
    for b
      a == b
        Ait.markMatched
        Bit.markMatched






*/