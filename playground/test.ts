import { getTextWithDiff } from "../src"

const sourceA = `0`
const sourceB = `1`

const result = getTextWithDiff(sourceA, sourceB);

console.log('Source:')
console.log(result.sourceA)

console.log(`\n`)
console.log('---------------------------------------------')
console.log(`\n`)

console.log('Revision:')
console.log(result.sourceB)
