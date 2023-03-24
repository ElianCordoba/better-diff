import { ChangeType, Side } from "./types";
import { equals, mergeRanges, normalize, range } from "./utils";
import { Iterator } from "./iterator";
import { Change, compactChanges } from "./change";
import { getContext } from "./index";
import { Node } from "./node";
import { assert } from "./debug";
import { AlignmentTable } from "./alignmentTable";
import { getLCS, LCSResult } from "./sequence";
import { OpenCloseVerifier } from "./openCloseVerifier";

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

      // Get best sequence based on the current a node
      const lcs = findBestMatch(iterA, iterB, a);

      // The above function internally may mark nodes as deleted, this is why we need to make sure we push the changes
      if (lcs.changes?.length) {
        changes.push(...lcs.changes);
      }

      if (lcs.bestSequence === 0) {
        continue;
      }

      // In case we obtain a sequence of length 1, we will only create a move if that single node can be matched alone.
      // If the move isn't created then we report them as addition/removal
      if (lcs.bestSequence === 1 && !a.canBeMatchedAlone) {
        iterA.mark(a.index, ChangeType.deletion);
        iterB.mark(b.index, ChangeType.addition);

        changes.push(
          new Change(ChangeType.addition, a, b),
          new Change(ChangeType.deletion, a, b),
        );

        if (a.isOpeningNode) {
          changes.push(
            ...OpenCloseVerifier.verifySingle(ChangeType.deletion, a, iterA, iterB),
            ...OpenCloseVerifier.verifySingle(ChangeType.addition, b, iterA, iterB)
          );
        }

        continue;
      }

      const moveChanges = matchSubsequence(iterA, iterB, lcs.indexA, lcs.indexB, lcs.bestSequence);

      if (moveChanges.length) {
        changes.push(...moveChanges);
      }
    }
  }

  loop();

  // TODO: Once we improve compaction to be on-demand, we will be able to remove this
  const deletions = changes.filter((x) => x.type === ChangeType.deletion).sort((a, b) => a.rangeA?.start - b.rangeA?.start);
  const additions = changes.filter((x) => x.type === ChangeType.addition).sort((a, b) => a.rangeB?.start - b.rangeB?.start);
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

  const verifier = new OpenCloseVerifier(iterA, iterB);

  let i = 0;
  while (i < lcs) {
    a = iterA.next(indexA)!;
    b = iterB.next(indexB)!;

    iterA.mark(a.index, ChangeType.move);
    iterB.mark(b.index, ChangeType.move);

    i++;
    indexA++;
    indexB++;

    assert(equals(a, b), `Misaligned matcher. A: ${indexA} (${a.prettyKind}), B: ${indexB} (${b.prettyKind})`);

    // Track node to ensure all open node are property matched with the corresponding closing nodes
    verifier.track(a);

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
  const didChange = a.index !== b.index;

  if (didChange) {
    changes.push(
      new Change(
        ChangeType.move,
        a,
        b,
        rangeA,
        rangeB,
      ),
    );
  }

  changes.push(...verifier.verify(ChangeType.move, didChange, indexA, indexB));

  return changes;
}

function findBestMatch(iterA: Iterator, iterB: Iterator, startNode: Node): LCSResult {
  const candidateOppositeSide = iterB.find(startNode);

  // Report deletion if applicable
  if (candidateOppositeSide.length === 0) {
    const changes = [new Change(ChangeType.deletion, startNode, startNode)];
    iterA.mark(startNode.index, ChangeType.deletion);

    // TODO: Maybe add the open/close here?
    return { changes, indexA: -1, indexB: -1, bestSequence: 0 };
  }

  // 1- Take best overall sequence
  let lcs = getLCS(startNode.index, candidateOppositeSide, iterA, iterB);

  const start = lcs.indexB;
  const end = start + lcs.bestSequence;

  // 2- Perform a match for every sub sequence, given "1 2 3", get the best match for "1", "2", "3", then pick the best
  for (const i of range(start, end)) {
    const node = iterB.peek(i);
    assert(node);

    // The Zigzag starts from B to A, intentionally. The rationale behind this is as follows:
    // The algorithm processes a sequence (beginning with a single node) and searches for it on the opposite side. If we were to start from A to B,
    // a suboptimal match might be found, such as matching "()" when a better match would be "console.log(". To avoid this,
    // we start from the other side, essentially questioning the assumption that the current node is the best choice.
    // For instance, if the current node is "(" on side A, we will examine all other alternatives on that side, like
    // "if (" or "console.log(", among others. Then, we select the best match based on the LCS.
    // Refer to the test "Properly match closing paren 3 inverse" for more information.
    // const candidateLCS = findBestMatchWithZigZag(iterB, iterA, node, true)
    const lcsForward = findBestMatchWithZigZag(iterB, iterA, node, false);
    const lcsForwardBackward = findBestMatchWithZigZag(iterB, iterA, node, true);

    // The rationale for performing two passes (forward and backward-forward) is somewhat intricate, but can be summarized as follows:
    // - Moving forward only might cause us to miss better matches when starting ahead of an optimal sequence:
    //
    // console.log()
    // ^ cursor here
    //
    // log(console.log())
    // ^ cursor here
    //
    // Forward-only LCS will select the sequence "()" instead of the preferable "console.log()".
    //
    // - Using both backward and forward passes avoids a situation where subsequence matching converges to the same result.
    // For example, given "1 2 3", if there is a "1 2 3" on the other side as well, all subsequences "1", "2", and "3" will lead to the same match.
    // However, we might lose a better match with a suboptimal start. Under "2", a superior match could be concealed within a zigzag iteration.
    // For a real-world example, refer to the test "Test Recursive matching 6 inverse".
    const candidateLCS = lcsForward.bestSequence > lcsForwardBackward.bestSequence ? lcsForward : lcsForwardBackward;

    if (candidateLCS.bestSequence > lcs.bestSequence) {
      lcs = candidateLCS;
    }
  }

  // 3- Before exiting do a backward pass to the lcs
  return checkLCSBackwards(iterA, iterB, lcs);
}

// This function performs a zigzag search between A and B to find the best match for a given sequence.
// The primary issue this algorithm addresses is illustrated in the following case:
//
// ----------A----------
//
// 1 2 3
// 1 2 3 4
//
// ----------B----------
// 1 2
// 1 2 3 4
//
// If we start with "1" on side A, we will choose the sequence "1 2 3". However, selecting this match disrupts a better match for the sequence on side B, which is the complete "1 2 3 4".
// This is why we alternate between sides, gathering candidates for each sequence and using LCS to ensure we choose the best match. In the example above, the process should be as follows:
// - Start on side A with "1 2 3".
// - Switch to side B, two candidates are available, one of which is longer "1 2 3 4", select that one.
// - Return to side A, no better matches found, so exit the search.
function findBestMatchWithZigZag(iterA: Iterator, iterB: Iterator, startNode: Node, bothDirections: boolean): LCSResult {
  let bestSequence = 0;
  let bestLCS: LCSResult | undefined;

  function process(iterOne: Iterator, iterTwo: Iterator, sequence: Node[]): LCSResult | undefined {
    const candidateOppositeSide = iterTwo.findSequence(sequence);

    if (candidateOppositeSide.length === 0) {
      return;
    }

    const node = sequence[0];

    const lcs = getLCS(node.index, candidateOppositeSide, iterOne, iterTwo, bothDirections);

    assert(lcs.bestSequence !== 0, "LCS resulted in 0");

    // If there is no better match, exit
    if (lcs.bestSequence === bestSequence) {
      return;
    }

    return lcs;
  }

  let _iterOne = iterA;
  let _iterTwo = iterB;
  let _sequence = [startNode];

  while (true) {
    const newResult = process(_iterOne, _iterTwo, _sequence);

    if (!newResult) {
      break;
    }

    if (newResult.bestSequence <= bestSequence) {
      continue;
    }

    bestLCS = newResult;
    bestSequence = newResult.bestSequence;
    _sequence = getSequence(_iterTwo, bestLCS);

    [_iterOne, _iterTwo] = [_iterTwo, _iterOne];
  }

  assert(bestLCS);

  return normalize(_iterTwo, bestLCS);
}

function getSequence(iter: Iterator, lcs: LCSResult): Node[] {
  return iter.textNodes.slice(lcs.indexB, lcs.indexB + lcs.bestSequence);
}

function checkLCSBackwards(iterA: Iterator, iterB: Iterator, lcs: LCSResult) {
  const seq = getSequence(iterB, lcs);
  const newSequenceCandidates = iterB.findSequence(seq);
  const backwardPassLCS = getLCS(lcs.indexA, newSequenceCandidates, iterA, iterB);

  if (backwardPassLCS.bestSequence > lcs.bestSequence) {
    return backwardPassLCS;
  } else {
    return lcs;
  }
}
