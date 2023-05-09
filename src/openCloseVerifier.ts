import { Node } from "./node";
import { Iterator } from "./iterator";
import { ClosingNodeGroup, getClosingNodeGroup, getOppositeNodeKind, getPrettyKind } from "./utils";
import { assert } from "./debug";
import { ChangeType, TypeMasks } from "./types";
import { Change } from "./change";
import { _context } from ".";

export class OpenCloseStack {
  allowedKind: number[];
  values: Node[] = [];

  constructor(node: Node) {
    // Normally we would like to initialize the stack only with a opening node, but if the code has syntax error we could end up in a situation
    // where we get the closing node first, check the test "Properly match closing paren 9" for an example
    const oppositeNode = getOppositeNodeKind(node);

    this.allowedKind = [node.kind, oppositeNode];
    this.values = [node];
  }

  add(node: Node) {
    assert(this.allowedKind.includes(node.kind), () => `Invalid kind provided to node-matching stack, expected either ${getPrettyKind(this.allowedKind[0])} or ${getPrettyKind(this.allowedKind[1])} but found ${node.prettyKind}`);

    if (node.isOpeningNode) {
      this.values.push(node);
    } else {
      this.values.pop();
    }
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

export class OpenCloseVerifier {
  private nodesToVerify: Map<ClosingNodeGroup, OpenCloseStack> = new Map();
  constructor(private iterA: Iterator, private iterB: Iterator) {
  }

  // This function will be called with all nodes, but we will discard everything but opening or closing nodes
  track(node: Node) {
    if (node.isOpeningNode || node.isClosingNode) {
      const nodeGroup = getClosingNodeGroup(node);
      // If the stack is not yet created, initialize it
      if (this.nodesToVerify.has(nodeGroup)) {
        this.nodesToVerify.get(nodeGroup)!.add(node);
      } else if (node.isOpeningNode) {
        // If the stack is not initialized _and_ it's a closing node, ignore it. This is to avoid syntax error and other edge cases
        this.nodesToVerify.set(nodeGroup, new OpenCloseStack(node));
      }
    }

    return this;
  }

  verify(changeType: ChangeType, indexA?: number, indexB?: number) {
    const changes: Change[] = [];
    const { matches } = _context;

    const indexOfOpenNodeMatch = matches.length - 1;

    for (const unmatchedOpeningNode of this.forEachRemainingNode()) {
      // Only calculate when needed, A is only involved in deletions, B only in additions. Moves require both nodes to be present
      const closingNodeForA = changeType & TypeMasks.DelOrMove ? this.iterA.findClosingNode(unmatchedOpeningNode, indexA) : undefined;
      const closingNodeForB = changeType & TypeMasks.AddOrMove ? this.iterB.findClosingNode(unmatchedOpeningNode, indexB) : undefined;

      // Now we diverge depending if we the nodes where removed / added or moved
      if (changeType & TypeMasks.AddOrDel) {
        // In a addition / deletion case, we need to find the corresponding missing node

        if (closingNodeForA) {
          assert(!closingNodeForB, () => "Found a node on B side node even though we are in a deletion");
          this.iterA.mark(closingNodeForA!.index, ChangeType.deletion);
          changes.push(new Change(ChangeType.deletion, [closingNodeForA.index]));
        }

        if (closingNodeForB) {
          assert(!closingNodeForA, () => "Found a node on a side node even though we are in a addition");
          this.iterB.mark(closingNodeForB!.index, ChangeType.addition);
          changes.push(new Change(ChangeType.addition, [closingNodeForB.index]));
        }

        return changes;
      }

      // I haven't figured out this one yet to include it in a test, but without this check the extreme test crashes
      if (!closingNodeForA && !closingNodeForB) {
        return changes;
      }

      // If we are in a move, there are two path, the happy one where we find both nodes
      if (closingNodeForA && closingNodeForB) {
        this.iterA.mark(closingNodeForA.index, ChangeType.move);
        this.iterB.mark(closingNodeForB.index, ChangeType.move);

        const _change = new Change(
          ChangeType.move,
          [closingNodeForA.index],
          [closingNodeForB.index],
        );

        matches.push(_change);

        matches.at(indexOfOpenNodeMatch)!.indexesOfClosingMoves.push(_change.index);
      } else {
        // If one of the nodes is missing, it's a syntax error, the is a open node unclosed.
        // We will still continue to processing the code by marking the found node as added / removed
        if (closingNodeForA) {
          this.iterA.mark(closingNodeForA!.index, ChangeType.deletion);
          changes.push(
            new Change(
              ChangeType.deletion,
              [closingNodeForA.index],
            ),
          );
        } else {
          this.iterB.mark(closingNodeForB!.index, ChangeType.addition);
          changes.push(new Change(ChangeType.addition, [closingNodeForB!.index]));
        }
      }
    }
    return changes;
  }

  // Simplified method for cases where we only need to check one node
  static verifySingle(changeType: ChangeType, node: Node, iterA: Iterator, iterB: Iterator) {
    return new OpenCloseVerifier(iterA, iterB).track(node).verify(changeType);
  }

  *forEachRemainingNode() {
    // For each open node kind (paren, brace, etc)...
    for (const stack of this.nodesToVerify.values()) {
      // If the stack isn't empty, then there are unmatched nodes
      if (!stack.isEmpty()) {
        for (const unmatchedOpeningNode of stack.values) {
          yield unmatchedOpeningNode;
        }
      }
    }
  }
}
