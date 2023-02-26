import { readdirSync, promises } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { getDiff } from '../../src'

// TODO: Fix
const IGNORED_TESTS: string[] = []

const path = join(__dirname, './')
let dirs = readdirSync(path)

// Remove the test runner file which is always the last one
dirs.splice(dirs.length - 1, 1)

describe('Real world tests', () => {
  for (const testCase of dirs) {
    if (IGNORED_TESTS.includes(testCase)) {
      continue
    }

    test(testCase, async () => {
      const { a, b } = await getTestFilesFromDir(testCase)

      try {
        getDiff(a, b)
      } catch (error) {
        expect((error as any)?.message).toBe(undefined)
      }
    })
  }
})

async function getTestFilesFromDir(dir: string) {
  const pathA = join(path, dir, 'a.ts')
  const pathB = join(path, dir, 'b.ts')

  const [a, b] = await Promise.all([
    promises.readFile(pathA),
    promises.readFile(pathB),
  ])

  return {
    a: a.toString(),
    b: b.toString()
  }
}