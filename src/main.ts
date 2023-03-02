import { ChangeType, Side } from "./types";
import { ClosingNodeGroup, equals, getClosingNodeGroup, mergeRanges, range } from "./utils";
import { Iterator } from "./iterator";
import { Change, compactChanges } from "./change";
import { getContext } from "./index";
import { Node } from "./node";
import { assert, fail } from "./debug";
import { AlignmentTable } from "./alignmentTable";
import { LCSResult, NodeMatchingStack, getLCS } from "./sequence";

export function getChanges(codeA: string, codeB: string): Change[] {
  const changes: Change[] = [];

  // console.time("IterA")
  const iterA = new Iterator({ source: codeA, name: Side.a });
  // console.timeEnd("IterA")

  // console.time("IterB")
  const iterB = new Iterator({ source: codeB, name: Side.b });
  // console.timeEnd("IterB")

  let a: Node | undefined;
  let b: Node | undefined;

  while (true) {
    if (iterA.done()) {
      break;
    }

    const possibleMatches: LCSResult[] = []

    for (const node of iterA.textNodes) {
      if (node.matched) {
        continue;
      }

      const lcs = newGetLCS(node, iterA, iterB)

      // Deletion
      if (lcs.bestSequence === 0) {
        changes.push(new Change(ChangeType.deletion, node, undefined))
        iterA.mark(node.index, ChangeType.deletion);
        continue
      }

      possibleMatches.push(lcs)
    }

    const sortedMatches = possibleMatches.sort((a, b) => a.bestSequence > b.bestSequence ? -1 : 1)

    for (const match of sortedMatches) {
      if (matchStillPossible(match, iterA, iterB)) {
        const { indexA, indexB, bestSequence } = match
        const moveChanges = matchSubsequence(iterA, iterB, indexA, indexB, bestSequence);

        if (moveChanges.length) {
          changes.push(...moveChanges);
        }
      }
    }

    console.log('lap')
  }

  if (!iterB.done()) {
    changes.push(...oneSidedIteration(iterB, ChangeType.addition))
  }

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

function newGetLCS(node: Node, iterOne: Iterator, iterTwo: Iterator): LCSResult {
  const candidates = iterTwo.findSequence([node]);

  if (candidates.length === 0) {
    // console.log(`Node ${node.prettyKind} not found. Side ${iterOne.name}`)
    return {
      bestSequence: 0,

    } as any;
  }

  const lcs = getLCS(node.index, candidates, iterOne, iterTwo)

  return lcs
}

// TODO USE A SET 
function matchStillPossible(match: LCSResult, iterOne: Iterator, iterTwo: Iterator): boolean {
  let indexA = match.indexA
  let indexB = match.indexB

  for (const i of range(0, match.bestSequence)) {
    const one = iterOne.textNodes[indexA + i];
    const two = iterTwo.textNodes[indexB + i];

    if (one.matched || two.matched) {
      return false
    }
  }

  return true

}