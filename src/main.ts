import { getNodesArray } from "./ts-util";
import { Candidate, ChangeType, Range } from "./types";
import { equals, mergeRanges } from "./utils";
import { Iterator } from "./iterator";
import { Change } from "./change";
import { getContext, getOptions } from "./index";
import { Node } from "./node";
import { DebugFailure } from "./debug";
import { AlignmentTable } from "./alignmentTable";

export function getInitialDiffs(codeA: string, codeB: string): Change[] {
  const changes: Change[] = [];

  const nodesA = getNodesArray(codeA);
  const nodesB = getNodesArray(codeB);

  const iterA = new Iterator(nodesA, { name: "a", source: codeA });
  const iterB = new Iterator(nodesB, { name: "b", source: codeB });

  // iterA.printPositionInfo(); console.log('\n'); iterB.printPositionInfo();

  let a: Node | undefined;
  let b: Node | undefined;

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

    // We didn't find any match
    if (candidatesAtoB.length === 0 && candidatesBtoA.length === 0) {
      // TODO: Maybe push change type 'change' ?

      // TODO(Align): If the widths or trivias are different, align

      changes.push(getChange(ChangeType.addition, a, b));
      changes.push(getChange(ChangeType.deletion, a, b));

      iterA.mark(a.index);
      iterB.mark(b.index);
      continue;
    }

    const lcsAtoB = getLCS(candidatesAtoB, iterA, iterB, a.index);
    const lcsBtoA = getLCS(candidatesBtoA, iterB, iterA, b.index);

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

    // This are the expressions we are matching. We store the them so that at the end of the LCS matching we can finish
    // matching these before moving on another expression
    const expressionA = iterA.peek(indexA)?.expressionNumber!;
    const expressionB = iterB.peek(indexB)?.expressionNumber!;

    const change = matchSubsequence(iterA, iterB, indexA, indexB, bestIndex, bestResult);

    if (change) {
      changes.push(change);
    }

    // TODO: The code bellow may be removed / reworked once I implement https://github.com/ElianCordoba/better-diff/issues/18
    continue;

    // We look for remaining nodes at index + bestResult because we don't want to include the already matched ones
    let remainingNodesA = iterA.getNodesFromExpression(expressionA, indexA + bestResult);
    let remainingNodesB = iterB.getNodesFromExpression(expressionB, indexB + bestResult);

    // If we finished matching the LCS and we don't have any remaining nodes in either expression, then we are done with the matching and we can move on
    if (!remainingNodesA.length && !remainingNodesB.length) {
      continue;
    }

    // If we still have nodes remaining, means that after the LCS the expression had more nodes that we need to match before moving on, for example
    //
    //
    // console.log(0)
    //
    // --------------
    //
    // console.log(1)
    //
    //
    // The LCS will only match the `console.log(` part, but before moving into another expression we need to match the remaining of the expression

    // First we complete the A side, if applicable
    changes.push(...finishSequenceMatching(iterA, iterB, remainingNodesA, remainingNodesB));

    // TODO: Maybe an optimization, could run faster if we call "finishSequenceMatching" on the one it has the most / least nodes to recalculate

    // After calling `finishSequenceMatching` we need to recalculate the remaining nodes since previously unmatched ones could have been matched now
    remainingNodesA = iterA.getNodesFromExpression(expressionA, indexA + bestResult);
    remainingNodesB = iterB.getNodesFromExpression(expressionB, indexB + bestResult);

    // Finally we complete the matching of the B side. This time we call `finishSequenceMatching` with the arguments inverted in order to check the other perspective
    changes.push(...finishSequenceMatching(iterB, iterA, remainingNodesB, remainingNodesA));
  }

  return compactChanges(changes);
}

function oneSidedIteration(
  iter: Iterator,
  typeOfChange: ChangeType.addition | ChangeType.deletion,
): Change[] {
  const changes: Change[] = [];

  let value = iter.next();

  const { alignmentTable } = getContext()

  // TODO: Compact
  while (value) {
    /// Alignment: Addition / Deletion ///
    if (typeOfChange === ChangeType.addition) {
      alignmentTable.add('a', value.lineNumberStart, value.text.length)
      changes.push(getChange(typeOfChange, undefined, value));
    } else {
      alignmentTable.add('b', value.lineNumberStart, value.text.length)
      changes.push(getChange(typeOfChange, value, undefined));
    }

    iter.mark(value.index);

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

function getLCS(candidates: Candidate[], iterA: Iterator, iterB: Iterator, indexA: number) {
  let bestResult = 0;
  let bestIndex = 0;
  let bestExpression = 0;

  if (candidates.length === 0) {
    return { bestIndex, bestResult };
  }

  for (const { index, expressionNumber } of candidates) {
    const lcs = getSequenceLength(iterA, iterB, indexA, index);

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
      // TODO: The code bellow may be removed / reworked once I implement https://github.com/ElianCordoba/better-diff/issues/18
      // || lcs === bestResult && expressionNumber < bestExpression
    ) {
      bestResult = lcs;
      bestIndex = index;
      bestExpression = expressionNumber;
    }
  }

  return { bestIndex, bestResult };
}

// This function has side effects, mutates data in the iterators
function matchSubsequence(iterA: Iterator, iterB: Iterator, indexA: number, indexB: number, indexOfBestResult: number, lcs: number): Change | undefined {
  let a = iterA.next(indexA)!;
  let b = iterB.next(indexB)!;

  let rangeA = a.getPosition();
  let rangeB = b.getPosition();

  let startA = a.lineNumberStart
  let startB = b.lineNumberStart

  let textMatched = ''

  const localAlignmentTable = new AlignmentTable()

  let index = indexOfBestResult;
  while (index < indexOfBestResult + lcs) {
    a = iterA.next(indexA)!;
    b = iterB.next(indexB)!;

    iterA.mark(a.index);
    iterB.mark(b.index);

    index++;
    indexA++;
    indexB++;

    if (!equals(a!, b!)) {
      throw new DebugFailure(`Misaligned matcher. A: ${indexA} (${a.prettyKind}), B: ${indexB} (${b.prettyKind})`);
    }

    /// Alignment: Move ///

    textMatched += a.text

    let _startA = a.lineNumberStart - startA
    let _startB = b.lineNumberStart - startB

    const linesDiff = Math.abs(_startA - _startB);

    if (linesDiff !== 0) {
      if (a.text.length !== b.text.length) {
        throw new Error('Ops')
      }

      const length = a.text.length
      if (_startA < _startB) {
        localAlignmentTable.add('a', b.lineNumberStart, length)
      } else {
        localAlignmentTable.add('b', a.lineNumberStart, length)
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

  let endA = a.lineNumberEnd
  let endB = b.lineNumberEnd

  if (startA !== startB || endA !== endB) {
    getContext().alignmentsOfMoves.push({
      startA,
      startB,
      endA,
      endB,
      text: textMatched
    })
  }

  // If the nodes are not in the same position then it's a move
  // TODO: Reported in the readme, this is too sensible
  const didChange = a!.index !== b!.index;

  if (didChange) {
    // Since this function is reversible we need to check the perspective so that we know if the change is an addition or a removal
    const perspectiveAtoB = iterA.name === "a";

    if (perspectiveAtoB) {
      const linesMoved = Math.abs(a!.lineNumberStart - b!.lineNumberStart);

      // Ignoring move if the code hasn't move far enough
      if (linesMoved < getOptions().minimumLinesMoved) {
        return;
      }

      return getChange(
        ChangeType.move,
        a!,
        b!,
        rangeA,
        rangeB,
      );
    } else {
      return getChange(
        ChangeType.move,
        b!,
        a!,
        rangeB,
        rangeA,
      );
    }
  }
}

function finishSequenceMatching(iterA: Iterator, iterB: Iterator, remainingNodesA: Node[], remainingNodesB: Node[]): Change[] {
  const changes: Change[] = [];

  let i = 0;
  while (i < remainingNodesA.length) {
    const current: Node = remainingNodesA[i];

    const candidatesInRemainingNodes = searchCandidatesInList(remainingNodesB, current);
    const candidates = candidatesInRemainingNodes.length ? candidatesInRemainingNodes : iterB.getCandidates(current);

    // Something added or removed
    if (!candidates.length) {
      iterA.mark(current.index);

      // Since this function is reversible we need to check the perspective so that we know if the change is an addition or a removal
      const perspectiveAtoB = iterA.name === "a";

      if (perspectiveAtoB) {
        changes.push(getChange(ChangeType.deletion, current, undefined));
      } else {
        changes.push(getChange(ChangeType.addition, undefined, current));
      }

      i++;
      continue;
    }

    const { bestIndex, bestResult } = getLCS(candidates, iterA, iterB, current.index);

    if (bestResult === 0) {
      throw new DebugFailure("LCS resulted in 0");
    }
    const indexA = current?.index!;
    const indexB = bestIndex;

    const change = matchSubsequence(iterA, iterB, indexA, indexB, bestIndex, bestResult);

    if (change) {
      changes.push(change);
    }

    i += bestResult;
  }

  // TODO: This should be enabled but, since the code that assigns the expression number doesn't work properly, it breaks if I enable this.
  // if (i != remainingNodesA.length) {
  //   throw new Error(`After finishing the whole sequence matching the length didn't match, expected ${remainingNodesA.length} but got ${i}`)
  // }

  return changes;
}

function searchCandidatesInList(nodes: Node[], expected: Node): Candidate[] {
  const candidates: Candidate[] = [];

  for (const node of nodes) {
    if (equals(node, expected)) {
      candidates.push({ index: node.index, expressionNumber: node.expressionNumber });
    }
  }

  return candidates;
}
