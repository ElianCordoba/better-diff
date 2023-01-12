<script lang="ts">
	import type { ServerResponse } from "../../../src/types";
	import Line from './line.svelte';
  
  export let sourceChunks: ServerResponse | undefined;

</script>

{#if sourceChunks}
  <div class="grid">
    {#each sourceChunks.chunksA as lineChunksA, i}
      <Line side={'a'} row={i + 1} chunks={lineChunksA} />
    {/each}
    {#each sourceChunks.chunksB as lineChunksB, i}
      <Line side={'b'} row={i + 1} chunks={lineChunksB} />
    {/each}
  </div>
{/if}

<style>
  .grid {
    display: grid;
  }
</style>