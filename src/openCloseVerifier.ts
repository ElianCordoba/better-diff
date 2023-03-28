import { Node } from "./node";
import { Iterator } from "./iterator";
import { ClosingNodeGroup, getClosingNodeGroup, getOppositeNodeKind, getPrettyKind } from "./utils";
import { assert } from "./debug";
import { ChangeType, TypeMasks } from "./types";
import { Change } from "./change";

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

  track(node: Node) {
    if (node.isOpeningNode || node.isClosingNode) {
      const nodeGroup = getClosingNodeGroup(node);
      if (this.nodesToVerify.has(nodeGroup)) {
        this.nodesToVerify.get(nodeGroup)!.add(node);
      } else if (node.isOpeningNode) {
        this.nodesToVerify.set(nodeGroup, new OpenCloseStack(node));
      }
    }
  }

  verify(changeType: ChangeType, trackChange: boolean, indexA?: number, indexB?: number) {
    const changes: Change[] = [];

    for (const unmatchedOpeningNode of this.forEachRemainingNode()) {
      // First we need to try find the closing nodes, which is not guaranteed

      // Only calculate when needed, A is involved in deletions, B in additions, moves require both

      const closingNodeForA = changeType & TypeMasks.DelOrMove ? this.iterA.findClosingNode(unmatchedOpeningNode, indexA) : undefined;
      const closingNodeForB = changeType & TypeMasks.AddOrMove ? this.iterB.findClosingNode(unmatchedOpeningNode, indexB) : undefined;

      // Now we diverge depending if we the nodes where removed / added or moved

      const addOrDel = ChangeType.deletion | ChangeType.addition;

      if (changeType & addOrDel) {
        if (closingNodeForA) {
          this.iterA.mark(closingNodeForA!.index, ChangeType.deletion);
          changes.push(new Change(ChangeType.deletion, closingNodeForA, undefined));
        }

        if (closingNodeForB) {
          this.iterB.mark(closingNodeForB!.index, ChangeType.addition);
          changes.push(new Change(ChangeType.addition, undefined, closingNodeForB));
        }

        return changes;
      }

      // If we are in a move, there are two path, the happy one where we find both nodes
      if (closingNodeForA && closingNodeForB) {
        this.iterA.mark(closingNodeForA.index, ChangeType.move);
        this.iterB.mark(closingNodeForB.index, ChangeType.move);

        if (trackChange) {
          changes.push(
            new Change(
              changeType,
              closingNodeForA,
              closingNodeForB,
            ),
          );
        }
      } else {
        // If one of the nodes is missing, it's a syntax error, the is a open node unclosed.
        // We will still continue to processing the code by marking the found node as added / removed

        assert(closingNodeForA || closingNodeForB, () => "Neither A or B where found during Open/Close reconciliation");

        if (closingNodeForA) {
          this.iterA.mark(closingNodeForA!.index, ChangeType.deletion);
          changes.push(new Change(ChangeType.deletion, closingNodeForA, undefined));
        } else {
          this.iterB.mark(closingNodeForB!.index, ChangeType.addition);
          changes.push(new Change(ChangeType.addition, undefined, closingNodeForB));
        }
      }
    }
    return changes;
  }

  static verifySingle(changeType: ChangeType, node: Node, iterA: Iterator, iterB: Iterator) {
    const nodes = new OpenCloseVerifier(iterA, iterB);

    nodes.track(node);

    return nodes.verify(changeType, true);
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
