<script lang="ts">
	import { SimpleGrid, Button } from '@svelteuidev/core';
	import { onMount } from 'svelte';

	import CodeInput from './codeInput.svelte';
	import Row from './row.svelte';
	import type { LinePair } from './types';

	let a: string = `
    x
    console.log(0)
  `;
	let b: string = `
    console.log(1)
    x
    z
  `;

	let linesA: string[] = [];
	let linesB: string[] = [];

	function getLines(text: string) {
		return text.replace(/\n$/, '').split('\n');
	}

	async function getDiff() {
		const body = JSON.stringify({ a, b });

		const result = await fetch('http://localhost:3000/', { method: 'post', body });

		const changes = await result.json();

		return {
			a: getLines(a),
			b: getLines(b),
			changes
		};
	}

	let linePairs: LinePair[] = [];
	function updateLinesPairs(): LinePair[] {
		const lines: LinePair[] = [];

		const max = Math.max(linesA.length, linesB.length);

		for (let i = 0; i < max; i++) {
			const lineA = linesA[i];
			const lineB = linesB[i];

			if (!lineA && !lineB) {
				continue;
			}
			lines.push({
				a: lineA,
				b: lineB
			});
		}

		return lines;
	}

	function updateDiff() {
		linesA = getLines(a);
		linesB = getLines(b);
		linePairs = updateLinesPairs();
	}

	onMount(() => {
		updateDiff();

	});
</script>

<Button on:click={() => updateDiff()} fullSize mt={20}>Process</Button>

<SimpleGrid cols={2} spacing="xs">
	<CodeInput bind:code={a} />
	<CodeInput bind:code={b} />
</SimpleGrid>

<SimpleGrid cols={2} spacing="xs" override={{ gap: 0 }}>
	{#each linePairs as { a, b }, i}
		<Row {a} {b} lineNumber={i} />
	{/each}
</SimpleGrid>
