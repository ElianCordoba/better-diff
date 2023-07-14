import { Diff } from '../change';
import { assert } from '../debug';
import { Iterator } from '../iterator'
import { Node } from '../node';
import { LCSResult, SequenceDirection, getLCS, getSequenceSingleDirection } from '../sequence';
import { ChangeType } from '../types';
import { getSequence, normalize, range } from '../utils';

export function findBestMatch(iterA: Iterator, iterB: Iterator, startNode: Node): LCSResult {
  const candidateOppositeSide = iterB.find(startNode);

  // Report deletion if applicable
  if (candidateOppositeSide.length === 0) {
    const changes = [new Diff(ChangeType.deletion, [startNode.index])];
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

    assert(lcs.bestSequence !== 0, () => "LCS resulted in 0");

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
    _sequence = getSequence(_iterTwo, bestLCS.indexB, bestLCS.bestSequence);

    [_iterOne, _iterTwo] = [_iterTwo, _iterOne];
  }

  assert(bestLCS, () => "No LCS found");

  return normalize(_iterTwo, bestLCS);
}

function checkLCSBackwards(iterA: Iterator, iterB: Iterator, lcs: LCSResult) {
  const backwardPassLCS = getSequenceSingleDirection(iterA, iterB, lcs.indexA, lcs.indexB, SequenceDirection.Backward);

  assert(backwardPassLCS.bestSequence !== 0, () => "Backwards LCS resulted in 0");

  if (backwardPassLCS.bestSequence > lcs.bestSequence) {
    return backwardPassLCS;
  } else {
    return lcs;
  }
}
