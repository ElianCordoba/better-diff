import { getNodesArray, Node } from "./ts-util";
import { InitialChange, ChangeType, Item } from "./types";
import { equals, formatSyntaxKind, NodeIterator } from "./utils";


export function getInitialDiffs(codeA: string, codeB: string): InitialChange[] {
  const nodesA = getNodesArray(codeA)
  const nodesB = getNodesArray(codeB)

  const changes: InitialChange[] = []

  const maxLength = Math.max(nodesA.length, nodesB.length)
  const minLength = Math.min(nodesA.length, nodesB.length)

  let cursor = 0;

  const iterA = NodeIterator(nodesA);
  const iterB = NodeIterator(nodesB);

  let a: Item | undefined;
  let b: Item | undefined;

  do {
    a = iterA.next();
    b = iterB.next();

    if (!a || !b) {
      break
    }

    if (equals(a.node, b.node)) {
      iterA.markMatched()
      iterB.markMatched()
      continue;
    }

    const nearbyMatch = iterB.nextNearby(a.node);

    if (nearbyMatch) {
      iterA.markMatched()
      iterB.markMatched()

      changes.push({
        type: ChangeType.change, index: iterA.getCursor(), hint: getChangeHint(a.node, b.node)
      })
      continue;
    }

    // No match
    changes.push({
      type: ChangeType.removal, index: iterA.getCursor(), hint: getChangeHint(a.node, b.node)
    })

    // En verdad mas que matched seria unmatched pero lo quiero marcar con algo
    iterA.markMatched()
  } while (a) // If there are no more nodes, a will be undefined

  while (b) {
    b = iterB.next();

    if (!b) {
      break
    }

    changes.push({ type: ChangeType.addition, index: iterB.getCursor(), hint: nodeToString(b.node, '+') })
    iterB.markMatched()
  }

  return changes
}

function nodeToString(node: Node, label: string) {
  return `${label} (${formatSyntaxKind(node.kind)}) ${node.text ? node.text : ''}`.trimEnd()
}

function getChangeHint(nodeA: Node, nodeB: Node) {
  const stringA = nodeToString(nodeA, 'A')
  const stringB = nodeToString(nodeB, 'B')
  return `${stringA} -> ${stringB}`;
}

