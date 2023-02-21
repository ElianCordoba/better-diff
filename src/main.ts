import { getNodesArray } from "./ts-util";
import { ChangeType, Range, Side } from "./types";
import { ClosingNodeGroup, equals, getClosingNodeGroup, mergeRanges, range } from "./utils";
import { Iterator } from "./iterator";
import { Change } from "./change";
import { getContext } from "./index";
import { Node } from "./node";
import { assert } from "./debug";
import { AlignmentTable } from "./alignmentTable";
import { NodeMatchingStack } from "./sequence";

export function getChanges(codeA: string, codeB: string): Change[] {
  const changes: Change[] = [];

  const nodesA = getNodesArray(codeA);
  const nodesB = getNodesArray(codeB);

  const iterA = new Iterator(nodesA, { name: Side.a, source: codeA });
  const iterB = new Iterator(nodesB, { name: Side.b, source: codeB });

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

      // We will try to match the code, comparing a node to another one on the other iterator
      // For a node X in the iterator A, we could get multiple possible matches on iterator B
      // But, we also check from the perspective of the iterator B, this is because of the following example
      // A: 1 2 x 1 2 3
      // B: 1 2 3
      // From the perspective of A, the LCS is [1, 2], but from the other perspective it's the real maxima [1, 2, 3]
      // More about this in the move tests
      const candidatesAtoB = iterB.getCandidates(a);
      const candidatesBtoA = iterA.getCandidates(b);

      // TODO(Align): If the widths or trivias are different, align

      let lcsAtoB: LCSResult = { bestResult: 0, bestIndex: 0 };
      let lcsBtoA: LCSResult = { bestResult: 0, bestIndex: 0 };

      if (candidatesAtoB.length) {
        lcsAtoB = getLCS(a, candidatesAtoB, iterA, iterB);
      } else {
        changes.push(new Change(ChangeType.deletion, a, b));
        iterA.mark(a.index, ChangeType.deletion);
      }

      if (candidatesBtoA.length) {
        lcsBtoA = getLCS(b, candidatesBtoA, iterB, iterA);
      } else {
        changes.push(new Change(ChangeType.addition, a, b));
        iterB.mark(b.index, ChangeType.addition);
      }

      // TODO: Maybe finish subsequence here too?
      if (candidatesAtoB.length === 0 && candidatesBtoA.length === 0) {
        // TODO: Maybe push change type 'change' ?
        continue;
      }

      let bestIndex: number;
      let bestResult: number;
      let indexA: number;
      let indexB: number;

      // For simplicity the A to B perspective has preference
      if (lcsAtoB.bestResult >= lcsBtoA.bestResult) {
        bestIndex = lcsAtoB.bestIndex;
        bestResult = lcsAtoB.bestResult;

        // If the best LCS is found on the A to B perspective, indexA is the current position since we moved on the b side
        indexA = a.index;
        indexB = bestIndex;
      } else {
        bestIndex = lcsBtoA.bestIndex;
        bestResult = lcsBtoA.bestResult;

        // This is the opposite of the above branch, since the best LCS was on the A side, there is were we need to reposition the cursor
        indexA = bestIndex;
        indexB = b.index;
      }

      assert(bestResult !== 0, "LCS resulted in 0");

      const moveChanges = matchSubsequence(iterA, iterB, indexA, indexB, bestIndex, bestResult);

      if (moveChanges.length) {
        changes.push(...moveChanges);
      }
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

export function tryMergeRanges(
  rangeA: Range,
  rangeB: Range,
): Range | undefined {
  if (rangeA.start === rangeB.start && rangeA.end === rangeB.end) {
    return rangeA;
  }

  let newStart: number;
  let newEnd: number;

  if (rangeA.end >= rangeB.start && rangeB.end >= rangeA.start) {
    newStart = Math.min(rangeA.start, rangeB.start);
    newEnd = Math.max(rangeA.end, rangeB.end);

    return {
      start: newStart,
      end: newEnd,
    };
  }
}

// TODO: Compact at the moment when we push new changes to the array. Mainly to save memory since we will avoid having a big array before the moment of compaction
export function compactChanges(changes: (Change & { seen?: boolean })[]) {
  const newChanges: Change[] = [];

  let currentChangeIndex = -1;
  for (const change of changes) {
    const candidate = change;

    currentChangeIndex++;

    if (change.seen) {
      continue;
    }

    if (change.type === ChangeType.move) {
      newChanges.push(change);
      continue;
    }

    // We start from the current position since we known that above changes wont be compatible
    let nextIndex = currentChangeIndex + 1;

    innerLoop:
    while (nextIndex < changes.length) {
      const next = changes[nextIndex];

      if (next.seen) {
        nextIndex++;
        continue;
      }

      if (change.type !== next.type) {
        nextIndex++;
        continue;
      }

      const readFrom = change!.type === ChangeType.deletion ? "rangeA" : "rangeB";

      const currentRange = change![readFrom]!;
      const nextRange = next[readFrom]!;

      const compatible = tryMergeRanges(currentRange, nextRange);

      if (!compatible) {
        nextIndex++;
        // No compatibility at i means that we can break early, there will be no compatibility at i + n because ranges keep moving on
        break innerLoop;
      }

      changes[nextIndex].seen = true;

      candidate[readFrom] = compatible;

      nextIndex++;
      continue;
    }

    newChanges.push(candidate);
  }

  return newChanges;
}

export function getSequenceLength(
  iterA: Iterator,
  iterB: Iterator,
  indexA: number,
  indexB: number,
): number {
  // Represents how long is the sequence
  let sequence = 0;

  while (true) {
    const nextA = iterA.peek(indexA);

    if (!nextA) {
      break;
    }

    const nextB = iterB.peek(indexB);

    if (!nextB) {
      break;
    }

    if (!equals(nextA, nextB)) {
      break;
    }

    indexA++;
    indexB++;
    sequence++;
  }

  return sequence;
}

interface LCSResult {
  bestIndex: number;
  bestResult: number;
}

function getLCS(wanted: Node, candidates: number[], iterA: Iterator, iterB: Iterator): LCSResult {
  let bestResult = 0;
  let bestIndex = 0;

  for (const index of candidates) {
    const lcs = getSequenceLength(iterA, iterB, wanted.index, index);

    // Store the new result if it's better that the previous one based on the length of the sequence
    if (
      lcs > bestResult
    ) {
      bestResult = lcs;
      bestIndex = index;
    }
  }

  return { bestIndex, bestResult };
}

// This function has side effects, mutates data in the iterators
function matchSubsequence(iterA: Iterator, iterB: Iterator, indexA: number, indexB: number, indexOfBestResult: number, lcs: number): Change[] {
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

  let index = indexOfBestResult;
  while (index < indexOfBestResult + lcs) {
    a = iterA.next(indexA)!;
    b = iterB.next(indexB)!;

    iterA.mark(a.index, ChangeType.move);
    iterB.mark(b.index, ChangeType.move);

    index++;
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
