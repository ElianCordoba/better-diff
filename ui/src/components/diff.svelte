<script lang="ts">
	import type { ServerResponse } from '../../../src/types';
	import Line from './line.svelte';

	export let sourceChunks: ServerResponse | undefined;
</script>

{#if sourceChunks}
	<div class="grid">
		{#each sourceChunks.chunksA as lineChunksA, i}
			<Line side={'a'} chunks={lineChunksA} {i} />
		{/each}
		{#each sourceChunks.chunksB as lineChunksB, i}
			<Line side={'b'} chunks={lineChunksB} {i} />
		{/each}
	</div>
{/if}

<style>
	.grid {
		display: grid;
		gap: 0 50px;
	}
</style>
