import { getInitialDiffs } from "../src/main"

const sourceA = `
  const num = 10

  function multiply(number, multiplier) {
    return number * multiplier
  }

  multiply(num, 5)
`

const sourceB = `
  const num = 15

  function multiply(number, multiplier) {
    function identity(x) {
      return x
    }
    return identity(number) * multiplier
  }

  multiply(num, 5)
`

const result = getInitialDiffs(sourceA, sourceB)
console.log(result)