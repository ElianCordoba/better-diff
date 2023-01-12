<script lang="ts">
	import { Group, Button } from '@svelteuidev/core';
	import { Prism } from '@svelteuidev/prism';
	import "prismjs/components/prism-typescript"; 
	
	import type { RenderInstruction, SourceChunk } from '../../../src/types';

	export let lineNumber: number | undefined = undefined;
	export let chunks: SourceChunk[] = [];
	export let side: 'a' | 'b';
	export let row: number;

	const HEIGHT = 35;

	const lineNumberClass = {
		height: HEIGHT,
		'min-width': '50px',
		padding: '0px 10px',
		'justify-content': 'flex-end',
		borderRadius: 0
	};

	const changeStyles: Record<RenderInstruction, any> = {
		default: {},
		addition: {
			backgroundColor: '#008000bd !important'
		},
		deletion: {
			backgroundColor: '#ff00007d !important'
		},
		move: {
			backgroundColor: '#3d3dff9e !important'
		}
	};

	function getStyles(type: RenderInstruction) {
		return changeStyles[type];
	}
</script>

<div class={side === 'a' ? 'colA' : 'colB'} style={`grid-row: ${row}`}>
	<Group override={{ borderRadius: 0, width: '100%', gap: 0 }}>
		<Button color="gray" compact override={lineNumberClass}>
			{lineNumber || ''}
		</Button>

		{#each chunks as chunk}
			<div
				style={`height: ${HEIGHT}px`}
				on:mouseover={() => {
					console.log(chunk.text);
				}}
				on:focus={() => {
					console.log(chunk.text);
				}}
			>
				<Prism
					code={chunk.text}
					language="ts"
					copy={false}
					override={{
						height: HEIGHT,
						...getStyles(chunk.type)
					}}
				/>
			</div>
		{/each}
	</Group>
</div>

<style>
	.colA {
		grid-column: 1;
	}

	.colB {
		grid-column: 2;
	}
</style>
