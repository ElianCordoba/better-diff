<script lang="ts">
  import { SimpleGrid, Button } from '@svelteuidev/core';
	import { onMount } from 'svelte';

  import CodeInput from './codeInput.svelte'
	import Row from './row.svelte';
	import type { LinePair } from './types';

  let a: string = `
    x
    console.log(0)
  `
  let b: string = `
    console.log(1)
    x
    z
  `

  let linesA: string[] = []
  let linesB: string[] = []

  function getLines(text: string) {
    return text.replace(/\n$/, "").split("\n");
  }

  async function getDiff() {
    const body = JSON.stringify({ a, b })

    const result = await fetch("http://localhost:3000/", { method: "post", body })

    const changes = await result.json()

    return {
      a: getLines(a),
      b: getLines(b),
      changes
    }
  }

  async function updateCode() {
    linesA = getLines(a);
    linesB = getLines(b);

    const { a: newA, b: newB } = await getDiff();


  }

  let linePairs: LinePair[] = []
  function updateLinesPairs(): LinePair[] {
    const lines: ({ a: string , b: string })[] = [];

    const max = Math.max(linesA.length, linesB.length)

    for (let i = 0; i < max ; i++) {
      const lineA = linesA[i]
      const lineB = linesB[i]

      if (!lineA && !lineB) {
        continue
      }
      lines.push({ 
        a: lineA,
        b: lineB
      })
    }

    
    return lines
  }

  console.log('INIT', linePairs)

  function updateDiff() {
    console.log(a)
    console.log(b)
    linesA = getLines(a);
    linesB = getLines(b);
    linePairs = updateLinesPairs()
  }

  onMount(() => {
    updateDiff()

    console.log('MMM', linePairs)
  })

</script>

<Button fullSize on:click={() => updateDiff()}>Process</Button>

<SimpleGrid cols={2} spacing="xs">
  <CodeInput bind:code={a} />
  <CodeInput bind:code={b} />
</SimpleGrid>

<SimpleGrid cols={2} spacing="xs" override={{ gap: 0 }}>
  {#each linePairs as { a, b }, i}
    <Row {a} {b} lineNumber={i} />
  {/each}
</SimpleGrid>
