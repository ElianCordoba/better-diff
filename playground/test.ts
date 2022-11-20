import { getSimplifiedDiff } from "../src"

const sourceA = `  124`

const sourceB = `  123`

const result = getSimplifiedDiff(sourceA, sourceB);

console.log(`\n`)
console.log('Source:')
console.log(result.sourceA)

console.log('---------------------------------------------')

console.log('Revision:')
console.log(result.sourceB)
console.log(`\n`)