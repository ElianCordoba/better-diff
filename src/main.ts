import { ChangeType, Side } from "./types";
import { equals, getSequence, getSideFromType, normalize, oppositeSide, range } from "./utils";
import { Iterator } from "./iterator";
import { Change, compactChanges } from "./change";
import { _context } from "./index";
import { Node } from "./node";
import { assert } from "./debug";
import { getLCS, getSequenceSingleDirection, LCSResult, SequenceDirection } from "./sequence";
import { OpenCloseVerifier } from "./openCloseVerifier";
import { OffsetTracker, Offset } from "./offsetTracker";

export function getChanges(codeA: string, codeB: string): Change[] {
  const changes: Change[] = [];

  const iterA = new Iterator({ side: Side.a, source: codeA });
  const iterB = new Iterator({ side: Side.b, source: codeB });

  _context.iterA = iterA;
  _context.iterB = iterB;

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
        const startFrom = !a ? b?.index : a.index;

        const remainingChanges = oneSidedIteration(iterOn, type, startFrom!);
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
          new Change(ChangeType.deletion, [a.index]),
          new Change(ChangeType.addition, [b.index]),
        );

        // We need to ensure that we the closing one is matched as well. Also, a == b, so no need to check if b is an open node
        if (a.isOpeningNode) {
          changes.push(
            ...OpenCloseVerifier.verifySingle(ChangeType.deletion, a, iterA, iterB),
            ...OpenCloseVerifier.verifySingle(ChangeType.addition, b, iterA, iterB),
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
  const deletions = changes.filter((x) => x.type === ChangeType.deletion).sort((a, b) => a.rangeA?.start! - b.rangeA?.start!);
  const additions = changes.filter((x) => x.type === ChangeType.addition).sort((a, b) => a.rangeB?.start! - b.rangeB?.start!);

  processAddAndDel(deletions, additions)

  const { matches, offsetTracker } = _context;

  const moves = processMoves(matches, offsetTracker);

  return compactChanges([...additions, ...deletions, ...moves]);
}

function processAddAndDel(additions: Change[], deletions: Change[]) {
  const unifiedList = [...additions, ...deletions].sort((a, b) => {
    const indexA = a.getFirstIndex()
    const indexB = b.getFirstIndex()

    return indexA < indexB ? -1 : 1
  })

  for (const change of unifiedList) {
    change.applyOffset()
  }
}

// This function receives all the matches and iterate over them in descending order of weight (matches with more text involved go first)
// For each, we try to aligned it, this means that we can put it side to side without breaking any other match, for example
//
// A          B
// ------------
// aa         b
// b          aa
//
// The most important match here is "aa", so we will aligned it as:
//
// A          B
// ------------
// -          b
// aa ◄─────► aa
// b          -
//
// Aligning the remaining match will break the first one, so we report it as a move:
//
// A          B
// ------------
// -     ┌──► b
// aa ◄──┼──► aa
// b  ◄──┘    -
function processMoves(matches: Change[], offsetTracker: OffsetTracker) {
  const changes: Change[] = [];

  const sortedMatches = matches.sort((a, b) => a.getWeight() < b.getWeight() ? 1 : -1);

  // If a match contains opening nodes, it's necessary to process the closing counterpart in the same way.
  // For instance, a match resulting in an "(" being moved, should have the matching ")" being reported as moved as well.
  // Similarly, if the initial match is ignored because it can be aligned, the corresponding closing node should also be ignored.
  const matchesToIgnore: number[] = [];

  // Process matches starting with the most relevant ones, the ones with the most text involved
  for (const match of sortedMatches) {
    const identicalNewLines = getNewLinesDifferences(match)
    if (identicalNewLines.length) {
      // TODO-NOW: It's hardcoded that we will insert the alignment bellow the node, this should see which parts has the most weight

      for (const discrepancy of identicalNewLines) {
        const side = getSideFromType(discrepancy.type)
        // TODO-SUPER-NOW: Recalc offsets??? si agrego arriba de uno recalcular pa abajo
        offsetTracker.add(side, discrepancy)
      }

    }

    if (matchesToIgnore.includes(match.index)) {
      continue;
    }

    // Track matches to ignore
    if (match.indexesOfClosingMoves.length) {
      matchesToIgnore.push(...match.indexesOfClosingMoves);
    }

    const indexA = offsetTracker.getOffset(Side.a, match.getFirstIndex(Side.a));
    const indexB = offsetTracker.getOffset(Side.b, match.getFirstIndex(Side.b));

    // If the nodes are aligned after calculating the offset means that there is no extra work needed
    if (indexA === indexB) {
      continue;
    }

    // There are two outcomes, if the match can be aligned, we add the corresponding alignments and move on.
    // If it can't be aligned then we report a move
    const canMoveBeAligned = offsetTracker.moveCanGetAligned(indexA, indexB);

    if (canMoveBeAligned) {
      // We need to add alignments to both sides, for example
      //
      // A          B
      // ------------
      // 1          2
      // 2          3
      // 3          1
      //
      // LCS is "2 3", so it results in:
      //
      // A          B
      // ------------
      // 1          -
      // 2          2
      // 3          3
      // -          1

      const sideToAlignStart = indexA < indexB ? Side.a : Side.b;
      const startIndex = sideToAlignStart === Side.a ? indexA : indexB;

      const indexDiff = Math.abs(indexA - indexB);

      for (const i of range(startIndex, startIndex + indexDiff)) {
        offsetTracker.add(sideToAlignStart, { type: ChangeType.move, index: i, numberOfNewLines: match.getNewLines() });
      }

      const sideToAlignEnd = oppositeSide(sideToAlignStart);
      const endIndex = (sideToAlignEnd === Side.a ? indexA : indexB) + 1;

      for (const i of range(endIndex, endIndex + indexDiff)) {
        offsetTracker.add(sideToAlignEnd, { type: ChangeType.move, index: i, numberOfNewLines: match.getNewLines() });
      }
    } else {
      if (match.indexesOfClosingMoves.length) {
        changes.push(...match.indexesOfClosingMoves.map((i) => matches[i]));
      }

      changes.push(match);
    }
  }

  return changes;
}

function getNewLinesDifferences(match: Change): Offset[] {
  const { indexesA, indexesB } = match
  const { iterA, iterB } = _context

  let insertionPointA = indexesA.at(-1)!
  let insertionPointB = indexesB.at(-1)!

  const discrepancies: Offset[] = []
  for (let i = 0; i < indexesA.length; i++) {
    const indexA = indexesA[i]
    const indexB = indexesB[i]

    const nodeA = iterA.textNodes.at(indexA)!
    const nodeB = iterB.textNodes.at(indexB)!

    if (nodeA.numberOfNewlines !== nodeB.numberOfNewlines) {
      const difference = Math.abs(nodeA.numberOfNewlines - nodeB.numberOfNewlines)
      let index: number;
      let type: ChangeType;

      // We insert alignments on the side with the least new lines
      if (nodeA.numberOfNewlines < nodeB.numberOfNewlines) {
        insertionPointA++
        // index = lineMapNodeTable[Side.a].get(nodeA.lineNumberStart)!
        index = insertionPointA

        type = ChangeType.deletion
      } else {
        insertionPointB++
        // index = lineMapNodeTable[Side.b].get(nodeB.lineNumberStart)!
        index = insertionPointB
        type = ChangeType.addition
      }

      discrepancies.push({
        index,
        type,
        numberOfNewLines: difference,
        change: match
      })
    }
  }

  return discrepancies
}

function oneSidedIteration(
  iter: Iterator,
  typeOfChange: ChangeType.addition | ChangeType.deletion,
  startFrom: number,
): Change[] {
  const changes: Change[] = [];

  let value = iter.next(startFrom);

  // TODO: Compact
  while (value) {
    if (typeOfChange === ChangeType.addition) {
      changes.push(new Change(typeOfChange, [value.index]));
    } else {
      changes.push(new Change(typeOfChange, [value.index]));
    }

    iter.mark(value.index, typeOfChange, true);

    value = iter.next(value.index + 1);
  }

  return changes;
}

// This function has side effects, mutates data in the iterators
function matchSubsequence(iterA: Iterator, iterB: Iterator, indexA: number, indexB: number, lcs: number): Change[] {
  const changes: Change[] = [];
  const { matches } = _context;

  let a = iterA.next(indexA)!;
  let b = iterB.next(indexB)!;

  const indexesA: number[] = []
  const indexesB: number[] = []

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

    indexesA.push(a.index)
    indexesB.push(b.index)

    assert(equals(a, b), () => `Misaligned matcher. A: ${indexA} (${a.prettyKind}), B: ${indexB} (${b.prettyKind})`);

    // Used for the open-close node correctness
    verifier.track(a);
  }

  matches.push(
    new Change(
      ChangeType.move,
      indexesA,
      indexesB,
    ),
  );

  // Ensure open-close node correctness, may push a change if nodes are missing
  changes.push(...verifier.verify(ChangeType.move, indexA, indexB));

  return changes;
}

function findBestMatch(iterA: Iterator, iterB: Iterator, startNode: Node): LCSResult {
  const candidateOppositeSide = iterB.find(startNode);

  // Report deletion if applicable
  if (candidateOppositeSide.length === 0) {
    const changes = [new Change(ChangeType.deletion, [startNode.index])];
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
