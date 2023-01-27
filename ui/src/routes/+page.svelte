<script lang="ts">
	import { getContext, onMount } from 'svelte';

	import { SimpleGrid, Button } from '@svelteuidev/core';
	import CodeInput from './codeInput.svelte';
	import Diff from '../components/diff.svelte';

	import type { SerializedResponse } from '../../../src/types';
	import { StoreKey, type Store } from '../stores';

	let a = `
    x
    console.log(0)
  `;
	let b = `
    console.log(1)
    x
    z
  `;

	let sourceChunks: SerializedResponse | undefined;

	const { displayErrorAlert } = getContext<Store>(StoreKey);

	async function getDiff() {
		const body = JSON.stringify({ a, b });

		let result;

		try {
			const res = await fetch('http://localhost:3000/', { method: 'post', body });
			result = await res.json();
			if (!res.ok) {
				throw result;
			}
		} catch (err: any) {
			displayErrorAlert(err.message);
			return;
		}

		sourceChunks = result;
	}

	function updateDiff() {
		getDiff();
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

<Diff {sourceChunks} />
