import { assert, describe, expect, test } from 'vitest'
import { Item } from '../../main2'
import { getNodesArray } from '../src/ts-util'
import { formatSyntaxKind, NodeIterator2 } from '../experiments/mvp/utils'

const aSource = `
  const num = 10

  function multiply(number, multiplier) {
    return number * multiplier
  }

  multiply(num, 5)
`

const aNodes = getNodesArray(aSource)

// 0 SyntaxList
// 1 VariableStatement
// 2 VariableDeclarationList
// 3 ConstKeyword
// 4 SyntaxList
// 5 VariableDeclaration

describe.only('Should iterate over node list properly', () => {

  test('Simple advance', () => {
    const { next, markMatched } = NodeIterator2(aNodes);

    expect(formatSyntaxKind(next().node.kind)).toBe("SyntaxList")
    markMatched()

    expect(formatSyntaxKind(next().node.kind)).toBe("VariableStatement")
    markMatched()

    expect(formatSyntaxKind(next().node.kind)).toBe("VariableDeclarationList")
    markMatched()

    expect(formatSyntaxKind(next().node.kind)).toBe("ConstKeyword")
    markMatched()

    expect(formatSyntaxKind(next().node.kind)).toBe("SyntaxList")
    markMatched()

    expect(formatSyntaxKind(next().node.kind)).toBe("VariableDeclaration")
    markMatched()
  })

  test('Advance skipping matched nodes', () => {
    const { next, markMatched } = NodeIterator2(aNodes);

    markMatched(1)
    markMatched(3)
    markMatched(4)

    expect(formatSyntaxKind(next().node.kind)).toBe("SyntaxList")
    markMatched()

    expect(formatSyntaxKind(next().node.kind)).toBe("VariableDeclarationList")
    markMatched()

    expect(formatSyntaxKind(next().node.kind)).toBe("VariableDeclaration")
    markMatched()
  })

  test.only('Find nearby token', () => {
    const { nextNearby, markMatched } = NodeIterator2(aNodes);

    markMatched(1)
    markMatched(2)
    markMatched(3)
    markMatched(4)

    const expected = aNodes[0]

    expect(formatSyntaxKind(nextNearby(expected, 5)!.node.kind)).toBe("SyntaxList")
  })

})
