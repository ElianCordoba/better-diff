import { ChangeType, Side } from "./types";
import { ClosingNodeGroup, equals, getClosingNodeGroup, mergeRanges, range } from "./utils";
import { Iterator } from "./iterator";
import { Change, compactChanges } from "./change";
import { getContext } from "./index";
import { Node } from "./node";
import { assert, fail } from "./debug";
import { AlignmentTable } from "./alignmentTable";
import { NodeMatchingStack, getLCS } from "./sequence";

export function getChanges(codeA: string, codeB: string): Change[] {
  const changes: Change[] = [];

  const iterA = new Iterator({ source: codeA, name: Side.a });
  const iterB = new Iterator({ source: codeB, name: Side.b });

  let a: Node | undefined;
  let b: Node | undefined;

  function loop() {
    while (true) {
      a = iterA.next();
      b = iterB.next();

      // Loop until both iterators are done
      if (!a && !b) {
        break;
      }

      // One of the iterators finished. We will traverse the remaining nodes in the other iterator
      if (!a || !b) {
        const iterOn = !a ? iterB : iterA;
        const type = !a ? ChangeType.addition : ChangeType.deletion;

        const remainingChanges = oneSidedIteration(iterOn, type);
        changes.push(...remainingChanges);
        break;
      }

      // Based on `a` and `b` find their best sequence
      const lcsA = recursivelyGetBestMatch(iterA, iterB, [a]);
      const lcsB = recursivelyGetBestMatch(iterB, iterA, [b]);

      // Regardless of which side is the best, the above function internally mark nodes as deleted / added, this is why we need to make sure we push the changes
      if (lcsA.changes.length || lcsB.changes.length) {
        changes.push(...lcsA.changes, ...lcsB.changes);
      }

      // This covers the case where it happens that both `a` and `b` where deleted and added, respectively
      if (lcsA.bestSequence === 0 && lcsB.bestSequence === 0) {
        continue;
      }

      const bestMatch = lcsA.bestSequence > lcsB.bestSequence ? lcsA : lcsB;
      const side = lcsA.bestSequence > lcsB.bestSequence ? Side.a : Side.b;

      // Start indexes for both iterators
      const indexA = bestMatch.indexA;
      const indexB = bestMatch.indexB;

      // We may get an sequence of length 1, in that case will only create a move if that single node can be matched alone (more about this in the node creation)
      // Notice that we pick either `a` or `b` depending on the side of the lcs, this is because a match will happen with one of those in the their current index
      // and a node in the opposite side that may be in another index
      //
      // A side:
      // 1 2 3
      // ^ cursor here
      //
      // B side:
      // 3 2 1
      //     ^ matching with this one
      const canNodeBeMatchedAlone = side === Side.a ? a.canBeMatchedAlone : b.canBeMatchedAlone;

      // TODO: Add lcs 1 move fast path

      if (bestMatch.bestSequence === 1 && !canNodeBeMatchedAlone) {
        iterA.mark(a.index, ChangeType.deletion);
        iterB.mark(b.index, ChangeType.addition);

        changes.push(
          new Change(ChangeType.addition, a, b),
          new Change(ChangeType.deletion, a, b)
        );
        continue;
      }

      const moveChanges = matchSubsequence(iterA, iterB, indexA, indexB, bestMatch.bestSequence);

      if (moveChanges.length) {
        changes.push(...moveChanges);
      }

      // TODO: Check the other candidate sequence, if it's nodes are unmatched we can safely match it. This is going to be more performant since we already calculated it
    }
  }

  loop();

  // TODO: Once we improve compaction to be on-demand, we will be able to remove this
  const deletions = changes.filter((x) => x.type === ChangeType.deletion).sort((a, b) => a.rangeA?.start! - b.rangeA?.start!);
  const additions = changes.filter((x) => x.type === ChangeType.addition).sort((a, b) => a.rangeB?.start! - b.rangeB?.start!);
  const moves = changes.filter((x) => x.type === ChangeType.move);

  return compactChanges([...additions, ...deletions, ...moves]);
}

function oneSidedIteration(
  iter: Iterator,
  typeOfChange: ChangeType.addition | ChangeType.deletion,
): Change[] {
  const changes: Change[] = [];

  let value = iter.next();

  const { alignmentTable } = getContext();

  // TODO: Compact
  while (value) {
    /// Alignment: Addition / Deletion ///
    if (typeOfChange === ChangeType.addition) {
      alignmentTable.add(Side.a, value.lineNumberStart, value.text.length);
      changes.push(new Change(typeOfChange, undefined, value));
    } else {
      alignmentTable.add(Side.b, value.lineNumberStart, value.text.length);
      changes.push(new Change(typeOfChange, value, undefined));
    }

    iter.mark(value.index, typeOfChange);

    value = iter.next();
  }

  return changes;
}

// This function has side effects, mutates data in the iterators
function matchSubsequence(iterA: Iterator, iterB: Iterator, indexA: number, indexB: number, lcs: number): Change[] {
  const changes: Change[] = [];

  let a = iterA.next(indexA)!;
  let b = iterB.next(indexB)!;

  let rangeA = a.getPosition();
  let rangeB = b.getPosition();

  const startA = a.lineNumberStart;
  const startB = b.lineNumberStart;

  let textMatched = "";

  const { alignmentTable } = getContext();
  const localAlignmentTable = new AlignmentTable();

  const nodesWithClosingVerifier: Map<ClosingNodeGroup, NodeMatchingStack> = new Map();

  let i = 0;
  while (i < lcs) {
    a = iterA.next(indexA)!;
    b = iterB.next(indexB)!;

    iterA.mark(a.index, ChangeType.move);
    iterB.mark(b.index, ChangeType.move);

    i++;
    indexA++;
    indexB++;

    assert(equals(a!, b!), `Misaligned matcher. A: ${indexA} (${a.prettyKind}), B: ${indexB} (${b.prettyKind})`);

    // If the node is either opening or closing, we need to track it to see if it has all opening nodes are closed
    if (a.isOpeningNode || a.isClosingNode) {
      const nodeGroup = getClosingNodeGroup(a);
      if (nodesWithClosingVerifier.has(nodeGroup)) {
        nodesWithClosingVerifier.get(nodeGroup)!.add(a);
      } else {
        nodesWithClosingVerifier.set(nodeGroup, new NodeMatchingStack(a));
      }
    }

    /// Alignment: Move ///

    textMatched += a.text;

    const _startA = a.lineNumberStart - startA;
    const _startB = b.lineNumberStart - startB;

    let alignmentHappened = false;

    const linesDiff = Math.abs(_startA - _startB);
    if (linesDiff !== 0) {
      alignmentHappened = true;

      // It's a guarantee that both "a" and "b" text are of the same length here
      const length = a.text.length;

      if (_startA < _startB) {
        localAlignmentTable.add(Side.a, b.lineNumberStart, length);
      } else {
        localAlignmentTable.add(Side.b, a.lineNumberStart, length);
      }
    }

    const triviaLinesDiff = Math.abs(a.triviaLinesAbove - b.triviaLinesAbove);
    if (!alignmentHappened && triviaLinesDiff !== 0) {
      if (a.triviaLinesAbove < b.triviaLinesAbove) {
        for (const i of range(a.lineNumberStart, a.lineNumberStart + triviaLinesDiff)) {
          alignmentTable.add(Side.a, i);
        }
      } else {
        for (const i of range(b.lineNumberStart, b.lineNumberStart + triviaLinesDiff)) {
          alignmentTable.add(Side.b, i);
        }
      }
    }

    /// Alignment end ///

    // If both iterators are in the same position means that the code is the same. Nothing to report we just mark the nodes along the way
    if (a?.index === b?.index) {
      continue;
    }

    rangeA = mergeRanges(rangeA, a.getPosition());
    rangeB = mergeRanges(rangeB, b.getPosition());
  }

  const endA = a.lineNumberEnd;
  const endB = b.lineNumberEnd;

  if (startA !== startB || endA !== endB) {
    getContext().alignmentsOfMoves.push({
      startA,
      startB,
      endA,
      endB,
      text: textMatched,
    });
  }

  // If the nodes are not in the same position then it's a move
  const didChange = a!.index !== b!.index;

  if (didChange) {
    // Since this function is reversible we need to check the perspective so that we know if the change is an addition or a removal
    const perspectiveAtoB = iterA.name === "a";

    let change: Change;
    if (perspectiveAtoB) {
      change = new Change(
        ChangeType.move,
        a!,
        b!,
        rangeA,
        rangeB,
      );
    } else {
      change = new Change(
        ChangeType.move,
        b!,
        a!,
        rangeB,
        rangeA,
      );
    }

    changes.push(change);
  }

  // After matching the sequence we need to verify all the kind of nodes that required matching are matched
  for (const stack of nodesWithClosingVerifier.values()) {
    // An empty stack means that that all open node got their respective closing node
    if (!stack.isEmpty()) {
      // For each kind, for example paren, brace, etc
      for (const unmatchedOpeningNode of stack.values) {
        const closingNodeForA = iterA.findClosingNode(unmatchedOpeningNode, indexA);
        assert(closingNodeForA, `Couldn't kind closing node for ${unmatchedOpeningNode.prettyKind} on A side`);

        const closingNodeForB = iterB.findClosingNode(unmatchedOpeningNode, indexB);
        assert(closingNodeForB, `Couldn't kind closing node for ${unmatchedOpeningNode.prettyKind} on B side`);

        // We know for sure that the closing nodes move, otherwise we would have seen them in the LCS matching
        iterA.mark(closingNodeForA.index, ChangeType.move);
        iterB.mark(closingNodeForB.index, ChangeType.move);

        // Similar to the LCS matching, only report moves if the nodes did in fact move
        if (didChange) {
          changes.push(
            new Change(
              ChangeType.move,
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

interface NewLCSResult {
  changes: Change[];
  bestSequence: number;
  indexA: number;
  indexB: number;
}

// This function recursively goes zig-zag between `a` and `b` trying to find the best match for a given sequence. Can be started with a sequence of just one node
// The main issue this algorithm tries to solve is the following case
// 
// a:
//
// 1 2 3
// 1 2 3 4
//
// b:
// 1 2
// 1 2 3 4
//
// If we start with "1" on `a` side, we will pick the sequence "1 2 3", the problem is that taking that match breaks a better match for the `b` side sequence, which is the full "1 2 3 4"
// This is why we jump from one side to the other, getting the candidates for each sequence and LCS to ensure we pick the best one, in the example above it should be something like this:
// - Start on `a` side, "1 2 3"
// - Jumps to `b` side, we have 2 candidates, one of which is longer, being "1 2 3 4", pick that one
// - Jumps back to `a`, no better matches found, exit
function recursivelyGetBestMatch(iterOne: Iterator, iterTwo: Iterator, currentBestSequence: Node[]): NewLCSResult {
  const changes: Change[] = [];

  // Start of the sequence node
  const node = currentBestSequence[0];

  // Find the current best sequence on the other side
  const candidateOppositeSide = iterTwo.findSequence(currentBestSequence);

  const perspective = iterOne.name === Side.a ? Side.a : Side.b;

  // Report addition / deletion
  if (candidateOppositeSide.length === 0) {
    const changeType = perspective === Side.a ? ChangeType.deletion : ChangeType.addition
    changes.push(new Change(changeType, node, node));

    // May be counter intuitive why both perspectives use `iterOne` instead of using both `iterOne` and `iterTwo`, the rationale is that on both perspective `iterOne` holds the missing node.
    // If it's a deletion `iterOne` is `a` and there where we mark the node that was present but it's no longer there in the revision
    // If it's an addition `iterOne` is `b` and there where we mark the node the newly added node that wasn't present in the source
    iterOne.markMultiple(node.index, currentBestSequence.length, changeType);

    return { changes, indexA: -1, indexB: -1, bestSequence: 0 };
  }

  const { bestSequence, startOfSequence } = getLCS(node.index, candidateOppositeSide, iterOne, iterTwo);

  if (bestSequence === currentBestSequence.length) {
    return {
      changes,
      bestSequence,
      ...getIndexes(perspective, node, iterTwo.peek(startOfSequence)!)
    };
  }

  const seq = iterTwo.textNodes.slice(startOfSequence, startOfSequence + bestSequence);

  if (seq.length === 0) {
    fail("New sequence has length 0");
  }

  return recursivelyGetBestMatch(iterTwo, iterOne, seq);
}

function getIndexes(perspective: Side, one: Node, two: Node): { indexA: number; indexB: number } {
  if (perspective === Side.a) {
    return {
      indexA: one.index,
      indexB: two.index,
    };
  } else {
    return {
      indexA: two.index,
      indexB: one.index,
    };
  }
}
