import { getNodesArray } from "./ts-util";
import { Candidate, ChangeType, Range, Side } from "./types";
import { ClosingNodeGroup, equals, getClosingNodeGroup, mergeRanges, range } from "./utils";
import { Iterator } from "./iterator";
import { Change } from "./change";
import { getContext } from "./index";
import { Node } from "./node";
import { DebugFailure } from "./debug";
import { AlignmentTable } from "./alignmentTable";
import { Stack } from "./sequence";

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
        changes.push(getChange(ChangeType.deletion, a, b));
        iterA.mark(a.index, ChangeType.deletion);
      }

      if (candidatesBtoA.length) {
        lcsBtoA = getLCS(b, candidatesBtoA, iterB, iterA);
      } else {
        changes.push(getChange(ChangeType.addition, a, b));
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

      if (bestResult === 0) {
        throw new DebugFailure("LCS resulted in 0");
      }

      const moveChanges = matchSubsequence(iterA, iterB, indexA, indexB, bestIndex, bestResult);

      if (moveChanges.length) {
        changes.push(...moveChanges);
      }

      const exps = getCommonAncestor(iterA, iterB, indexA, indexB);

      if (!iterA.hasBufferedNodes()) {
        let remainingNodesA = iterA.getNodesFromExpression(iterA.peek(indexA, false)!, exps.expA);

        if (remainingNodesA.length) {
          iterA.bufferNodes(remainingNodesA.map(x => x.index))
        }
      }

      if (!iterB.hasBufferedNodes()) {
        let remainingNodesB = iterB.getNodesFromExpression(iterB.peek(indexB, false)!, exps.expB);

        if (remainingNodesB.length) {
          iterB.bufferNodes(remainingNodesB.map(x => x.index))
        }
      }

      console.log()
    }
  }

  loop();

  // TODO: Once we improve compaction to be on-demand, we will be able to remove this
  const deletions = changes.filter(x => x.type === ChangeType.deletion).sort((a, b) => a.rangeA?.start! - b.rangeA?.start!)
  const additions = changes.filter(x => x.type === ChangeType.addition).sort((a, b) => a.rangeB?.start! - b.rangeB?.start!)
  const moves = changes.filter(x => x.type === ChangeType.move)

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
      changes.push(getChange(typeOfChange, undefined, value));
    } else {
      alignmentTable.add(Side.b, value.lineNumberStart, value.text.length);
      changes.push(getChange(typeOfChange, value, undefined));
    }

    iter.mark(value.index, typeOfChange);

    value = iter.next();
  }

  return changes;
}

function getChange(
  type: ChangeType,
  a: Node | undefined,
  b: Node | undefined,
  rangeA?: Range,
  rangeB?: Range,
): Change {
  if (!rangeA) {
    rangeA = a?.getPosition();
  }

  if (!rangeB) {
    rangeB = b?.getPosition();
  }

  return new Change(type, rangeA, rangeB, a, b);
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

interface LCSResult { bestIndex: number; bestResult: number; }

function getLCS(wanted: Node, candidates: Candidate[], iterA: Iterator, iterB: Iterator): LCSResult {
  let bestResult = 0;
  let bestIndex = 0;
  let bestExpression = 0;
  let bestScore = 0

  const targetExp = iterA.peek(wanted.index)?.expressionNumber!

  for (const { index, expressionNumber } of candidates) {
    const lcs = getSequenceLength(iterA, iterB, wanted.index, index);

    // There are 2 conditions to set the new best candidate
    // 1) The new result is simply better that the previous one.
    // 2) There is a tie but the new candidate is less deep
    //
    // Why do we favour the candidate with less depth? Because of the following example:
    //
    // fn1(fn2(1))
    //
    // Under the correct circumstances, we could find ourself with the above code example, with the "fn1(fn2(" part already matched, missing the rest
    // If we assume that "1" is an addition, next on the matching list is the first ")", without the depth check, we would take the closing parenthesis after the "1"
    // and match it with the opening paren of "fn1". A lower depth means that it will be closer to the expression we are matching
    //
    // The test that covers this logic is the one called "Properly match closing paren"
    if (
      lcs > bestResult
    ) {
      bestResult = lcs;
      bestIndex = index;
      bestExpression = expressionNumber;
    }
  }

  return { bestIndex, bestResult };
}

function getScore(target: number, candidate: number) {
  const maxScore = target;

  const offBy = maxScore - (+candidate)

  return maxScore - offBy
}

// This function has side effects, mutates data in the iterators
function matchSubsequence(iterA: Iterator, iterB: Iterator, indexA: number, indexB: number, indexOfBestResult: number, lcs: number): Change[] {
  const changes: Change[] = []

  let a = iterA.next(indexA)!;
  let b = iterB.next(indexB)!;

  let rangeA = a.getPosition();
  let rangeB = b.getPosition();

  const startA = a.lineNumberStart;
  const startB = b.lineNumberStart;

  let textMatched = "";

  const { alignmentTable } = getContext();
  const localAlignmentTable = new AlignmentTable();

  const nodesWithClosingVerifier: Map<ClosingNodeGroup, Stack> = new Map();

  let index = indexOfBestResult;
  while (index < indexOfBestResult + lcs) {
    a = iterA.next(indexA)!;
    b = iterB.next(indexB)!;

    iterA.mark(a.index, ChangeType.move);
    iterB.mark(b.index, ChangeType.move);

    index++;
    indexA++;
    indexB++;

    if (!equals(a!, b!)) {
      throw new DebugFailure(`Misaligned matcher. A: ${indexA} (${a.prettyKind}), B: ${indexB} (${b.prettyKind})`);
    }

    /// Closing node

    if (a.isOpeningNode || a.isClosingNode) {
      const nodeGroup = getClosingNodeGroup(a)
      if (nodesWithClosingVerifier.has(nodeGroup)) {
        nodesWithClosingVerifier.get(nodeGroup)!.add(a)
      } else {
        nodesWithClosingVerifier.set(nodeGroup, new Stack(a))
      }
    }

    ///

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

  for (let stack of nodesWithClosingVerifier.values()) {
    if (!stack.isEmpty()) {
      for (const unmatchedOpeningNode of stack.values) {


        const closingNodeForA = iterA.findClosingNode(unmatchedOpeningNode, indexA)
        const closingNodeForB = iterB.findClosingNode(unmatchedOpeningNode, indexB)

        if (!closingNodeForA) {
          throw new DebugFailure(`Couldn't kind closing node for ${unmatchedOpeningNode.prettyKind} on A side`)
        }

        if (!closingNodeForB) {
          throw new DebugFailure(`Couldn't kind closing node for ${unmatchedOpeningNode.prettyKind} on B side`)
        }

        iterA.mark(closingNodeForA.index, ChangeType.move)
        iterB.mark(closingNodeForB.index, ChangeType.move)

        changes.push(
          getChange(
            ChangeType.move,
            unmatchedOpeningNode,
            closingNodeForB,
          ),
          getChange(
            ChangeType.move,
            closingNodeForA,
            unmatchedOpeningNode,
          )
        )

      }
    }
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
      change = getChange(
        ChangeType.move,
        a!,
        b!,
        rangeA,
        rangeB,
      );
    } else {
      change = getChange(
        ChangeType.move,
        b!,
        a!,
        rangeB,
        rangeA,
      );
    }

    changes.push(change)
  }

  return changes
}

// Go back as far as possible over every node (non text node included) to find the oldest common ancestor.
// This is so that we can match every remaining node in the expression
function getCommonAncestor(iterA: Iterator, iterB: Iterator, indexA: number, indexB: number) {
  const a = iterA.peek(indexA, false);
  const b = iterB.peek(indexB, false);

  const realANodeIndex = iterA.allNodes.findIndex((x) => x === a);
  const realBNodeIndex = iterB.allNodes.findIndex((x) => x === b);

  let offset = 0;

  let expA = a?.expressionNumber ?? -1;
  let expB = b?.expressionNumber ?? -1;

  while (true) {
    offset++;

    const prevA = iterA.allNodes.at(realANodeIndex - offset);
    const prevB = iterB.allNodes.at(realBNodeIndex - offset);

    // No more nodes on one or the sides, exit
    if (!prevA || !prevB) {
      break;
    }

    // No longer sharing common ancestor, exit
    if (prevA.kind !== prevB.kind) {
      break;
    }

    expA = prevA.expressionNumber;
    expB = prevB.expressionNumber;

    offset++;
  }

  if (expA === -1 || expB === -1) {
    throw new DebugFailure("Expression not found when trying to get common ancestor");
  }

  return { expA, expB };
}
