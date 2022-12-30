<script lang="ts">
	import Line from './line.svelte';

	export let lineNumber: number = -1;
	export let a: string | undefined;
	export let b: string | undefined;
</script>

<Line {lineNumber} code={a} />
<Line {lineNumber} code={b} />
