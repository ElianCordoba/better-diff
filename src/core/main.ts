import { ChangeType, Side } from "../types";
import { equals, oppositeSide, range } from "../utils";
import { Iterator } from "../iterator";
import { Diff, compactChanges } from "../change";
import { _context } from "../index";
import { Node } from "../node";
import { assert } from "../debug";
import { OpenCloseVerifier } from "../openCloseVerifier";
import { LineAlignmentTable, compactAlignments, insertMoveAlignment, insertNewLineAlignment } from "../textAligner";
import { ParsedProgram } from "../shared/language";
import { findBestMatch } from "./find_diffs";

export function computeDiff(programA: ParsedProgram, programB: ParsedProgram): Diff[] {
  const changes: Diff[] = [];

  const iterA = new Iterator(programA);
  const iterB = new Iterator(programB);

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
          new Diff(ChangeType.deletion, [a.index]),
          new Diff(ChangeType.addition, [b.index]),
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
  const deletions = compactChanges(ChangeType.deletion, changes.filter((x) => x.type === ChangeType.deletion));
  const additions = compactChanges(ChangeType.addition, changes.filter((x) => x.type === ChangeType.addition));

  processAddAndDel(deletions, additions);

  const { matches } = _context;

  const moves = processMoves(matches);

  const { a: aAlignments, b: bAlignments } = _context.textAligner
  compactAlignments(aAlignments, bAlignments);

  return [...additions, ...deletions, ...moves];
}

function processAddAndDel(additions: Diff[], deletions: Diff[]) {
  // Merge all the alignments
  let additionsOffsets: LineAlignmentTable = new Map()
  additions.map(x => {
    const offsets = x.applyOffset()
    for (const [l, n] of offsets) {
      additionsOffsets.set(l, n)
    }
  })


  let deletionOffsets: LineAlignmentTable = new Map()
  deletions.map(x => {
    const offsets = x.applyOffset()
    for (const [l, n] of offsets) {
      deletionOffsets.set(l, n)
    }
  })


  compactAlignments(deletionOffsets, additionsOffsets)

  // Apply the non-compacted changes

  const unifiedList = [...additionsOffsets, ...deletionOffsets].sort((a, b) => {
    const indexA = a[1].index!
    const indexB = b[1].index!

    return indexA < indexB ? -1 : 1
  })

  for (const [, alignment] of unifiedList) {
    alignment.lineNumber = _context.textAligner.getOffsettedLineNumber(oppositeSide(alignment.side!), alignment.lineNumber)
    _context.textAligner.add(alignment.side!, alignment)
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
function processMoves(matches: Diff[]) {
  const changes: Diff[] = [];
  const { offsetTracker } = _context;

  const sortedMatches = matches.sort((a, b) => a.getWeight() < b.getWeight() ? 1 : -1);

  // If a match contains opening nodes, it's necessary to process the closing counterpart in the same way.
  // For instance, a match resulting in an "(" being moved, should have the matching ")" being reported as moved as well.
  // Similarly, if the initial match is ignored because it can be aligned, the corresponding closing node should also be ignored.
  const matchesToIgnore: number[] = [];

  // Process matches starting with the most relevant ones, the ones with the most text involved
  for (const match of sortedMatches) {
    let didApplyFormatAlignment = false

    if (matchesToIgnore.includes(match.index)) {
      // TODO-NOW Format?
      continue;
    }

    // Track matches to ignore
    if (match.indexesOfClosingMoves.length) {
      matchesToIgnore.push(...match.indexesOfClosingMoves);
    }

    const indexA = match.getFirstIndex(Side.a);
    const indexB = match.getFirstIndex(Side.b);

    const offsettedIndexA = offsetTracker.getOffset(Side.a, indexA);
    const offsettedIndexB = offsetTracker.getOffset(Side.b, indexB);

    // If the nodes are aligned after calculating the offset means that there is no extra work needed
    if (offsettedIndexA === offsettedIndexB) {
      insertNewLineAlignment(match, true)
      didApplyFormatAlignment = true
      continue;
    }

    // There are two outcomes, if the match can be aligned, we add the corresponding alignments and move on.
    // If it can't be aligned then we report a move
    const canMoveBeAligned = offsetTracker.moveCanGetAligned(offsettedIndexA, offsettedIndexB);

    if (!didApplyFormatAlignment) {
      insertNewLineAlignment(match, canMoveBeAligned);
    }

    if (canMoveBeAligned) {
      insertMoveAlignment(match, offsettedIndexA, offsettedIndexB);
    } else {
      if (match.indexesOfClosingMoves.length) {
        changes.push(...match.indexesOfClosingMoves.map((i) => matches[i]));
      }

      changes.push(match);
    }
  }

  return changes;
}

function oneSidedIteration(
  iter: Iterator,
  typeOfChange: ChangeType.addition | ChangeType.deletion,
  startFrom: number,
): Diff[] {
  const changes: Diff[] = [];

  let value = iter.next(startFrom);

  while (value) {
    changes.push(new Diff(typeOfChange, [value.index]));

    iter.mark(value.index, typeOfChange, true);
    value = iter.next(value.index + 1);
  }

  return changes;
}

// This function has side effects, mutates data in the iterators
function matchSubsequence(iterA: Iterator, iterB: Iterator, indexA: number, indexB: number, lcs: number): Diff[] {
  const changes: Diff[] = [];
  const { matches } = _context;

  const indexesA: number[] = [];
  const indexesB: number[] = [];

  let a: Node;
  let b: Node;

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

    indexesA.push(a.index);
    indexesB.push(b.index);

    assert(equals(a, b), () => `Misaligned matcher. A: ${indexA} (${a.prettyKind}), B: ${indexB} (${b.prettyKind})`);

    // Used for the open-close node correctness
    verifier.track(a);
  }

  matches.push(
    new Diff(
      ChangeType.move,
      indexesA,
      indexesB,
    ),
  );

  // Ensure open-close node correctness, may push a change if nodes are missing
  changes.push(...verifier.verify(ChangeType.move, indexA, indexB));

  return changes;
}
