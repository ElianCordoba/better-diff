<script lang="ts">
	import { Group, Button } from '@svelteuidev/core';
	import { Prism } from '@svelteuidev/prism';
	import type { RenderInstruction, SourceChunk } from '../../../src/types'

	export let lineNumber: number | undefined = undefined;
	export let chunks: SourceChunk[] = [];
	export let side: "a" | "b";
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
			backgroundColor: "#008000bd !important"
		},
		deletion: {
			backgroundColor: "#ff00007d !important"
		},
		move: {
			backgroundColor: "#3d3dff9e !important"
		}
	}

	function getStyles(type: RenderInstruction) {
		return changeStyles[type]
	}

	
</script>

<div class={side ==='a' ? "colA" : 'colB'} style={`grid-row: ${row}`}>
	<Group override={{ borderRadius: 0, width: '100%', gap: 0 }}>
		<Button color="gray" compact override={lineNumberClass}>
			{lineNumber || ''}
		</Button>
	
		
			{#each chunks as chunk}
				<Prism
					code={chunk.text}
					language="js"
					copy={false}
					override={{
						height: HEIGHT,
						...getStyles(chunk.type)
					}} 
				/>
				<!--
					paddingLeft: 20 
					width: '90%' <div>
					{chunk.text}
				</div> -->
			{/each}
			<!-- TODO: Lang ts doesn't work
			<Prism
				{code}
				language="js"
				copy={false}
				override={{ width: '90%', height: HEIGHT, paddingLeft: 20 }}
			/> -->
	</Group>
	
</div>

<style>
	.colA {
		grid-column: 1;
	}

	.colB {
		grid-column: 2;
	}

	.addition {
		background-color: #008000bd;
	}

	.deletion {
		background-color: #ff00007d;
	}
</style>