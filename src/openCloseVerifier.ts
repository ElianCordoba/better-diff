import { Node } from "./node";
import { Iterator } from "./iterator";
import { ClosingNodeGroup, getClosingNode, getClosingNodeGroup, getPrettyKind } from "./utils";
import { assert } from "./debug";
import { ChangeType } from "./types";
import { Change } from "./change";

export class OpenCloseStack {
  allowedKind: number[];
  values: Node[] = [];

  constructor(openNode: Node) {
    // if (!openNode.isOpeningNode) {
    //   return (this.allowedKind = [] as any)
    // }
    assert(openNode.isOpeningNode, `Expected a opening node when initializing a node-matching stack but found a ${openNode.prettyKind}`);

    const closeNodeKind = getClosingNode(openNode);
    this.allowedKind = [openNode.kind, closeNodeKind];
    this.values = [openNode];
  }

  add(node: Node) {
    assert(this.allowedKind.includes(node.kind), `Invalid kind provided to node-matching stack, expected either ${getPrettyKind(this.allowedKind[0])} or ${getPrettyKind(this.allowedKind[1])} but found ${node.prettyKind}`);

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
      } else {
        this.nodesToVerify.set(nodeGroup, new OpenCloseStack(node));
      }
    }
  }

  verify(changeType: ChangeType, didChange: boolean, indexA?: number, indexB?: number) {
    const changes: Change[] = [];
    // After matching the sequence we need to verify all the kind of nodes that required matching are matched
    for (const stack of this.nodesToVerify.values()) {
      // An empty stack means that that all open node got their respective closing node
      if (!stack.isEmpty()) {
        // For each kind, for example paren, brace, etc
        for (const unmatchedOpeningNode of stack.values) {
          let closingNodeForA: Node | undefined;
          let closingNodeForB: Node | undefined;

          if (changeType === ChangeType.deletion || changeType === ChangeType.move) {
            closingNodeForA = this.iterA.findClosingNode(unmatchedOpeningNode, indexA);
            if (closingNodeForA) {
              this.iterA.mark(closingNodeForA.index, changeType);
            }
            // assert(closingNodeForA, `Couldn't kind closing node for ${unmatchedOpeningNode.prettyKind} on A side`);

          }

          if (changeType === ChangeType.addition || changeType === ChangeType.move) {
            closingNodeForB = this.iterB.findClosingNode(unmatchedOpeningNode, indexB);
            if (closingNodeForB) {
              this.iterB.mark(closingNodeForB.index, changeType);
            }
            // assert(closingNodeForB, `Couldn't kind closing node for ${unmatchedOpeningNode.prettyKind} on B side`);

          }

          // Similar to the LCS matching, only report moves if the nodes did in fact move
          if (didChange) {
            changes.push(
              new Change(
                changeType,
                closingNodeForA,
                closingNodeForB,
              ),
            );
          }
        }
      }
    }
    return changes;
  }

  static verifySingle(changeType: ChangeType, node: Node, iterA: Iterator, iterB: Iterator) {
    const nodes = new OpenCloseVerifier(iterA, iterB)

    nodes.track(node)

    return nodes.verify(changeType, true)
  }
}
