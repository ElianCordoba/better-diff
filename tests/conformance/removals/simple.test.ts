import { test, expect } from 'vitest'
import { getInitialDiffs } from '../../../src/main'

const sourceA = `
  let name;
  let age;
`

const sourceB = `
  let name;
`

test('Removed line bellow', () => {
  const changes = getInitialDiffs(sourceA, sourceB)

  console.log(changes)
})
