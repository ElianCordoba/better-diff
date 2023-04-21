<script lang="ts">
	import type { SerializedResponse } from '../../../src/types';
	import Line from './line.svelte';

	export let sourceChunks: SerializedResponse | undefined;
</script>

{#if sourceChunks}
	<div class="grid code-container">
		<div class="code-side">
			{#each sourceChunks.chunksA as lineChunksA, i}
				<Line side={'a'} chunks={lineChunksA} {i} />
			{/each}
		</div>
		<div class="code-side">
			{#each sourceChunks.chunksB as lineChunksB, i}
				<Line side={'b'} chunks={lineChunksB} {i} />
			{/each}	
		</div>
	</div>
{/if}

<style>
	.grid {
		display: grid;
		align-items: start;
		justify-items: start;
		justify-content: start;
	}
	.code-container {
		grid-template-columns: 1fr 1fr;
	}

	.code-side {
		grid-template-rows: repeat(auto-fit, minmax(20px, 1fr));
		/* border: 1px solid black; */
		width: 100%;
	  overflow: auto;
	}
</style>
