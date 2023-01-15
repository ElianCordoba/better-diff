<script lang="ts">
	import { Group, Button } from '@svelteuidev/core';
	import { Prism } from '@svelteuidev/prism';
	import 'prismjs/components/prism-typescript';
	import { onMount } from 'svelte';

	import { RenderInstruction, type SourceChunk } from '../../../src/types';

	export let i: number = 0;
	let lineNumber = i + 1

	export let chunks: SourceChunk[] = [];
	export let side: 'a' | 'b';

	const LINE_HEIGHT = '27px';

	const changeStyles: Record<RenderInstruction, any> = {
		default: {},
		addition: {
			backgroundColor: '#008000bd !important'
		},
		deletion: {
			backgroundColor: '#ff00007d !important'
		},
		move: {
			backgroundColor: '#1e40af8c !important'
		}
	};

	function getStyles(type: RenderInstruction) {
		const baseStyles = {
			height: LINE_HEIGHT,
			padding: '0px'
		};

		return { ...baseStyles, ...changeStyles[type] };
	}

	function highlightMove(isMove: boolean, id: string, action: 'on' | 'off') {
		// TODO: Only add event listener to moves
		if (!isMove) {
			return;
		}

		const elements = document.querySelectorAll(`[data-move-id="${id}"]`);

		const fn = action === 'on' ? 'add' : 'remove';

		for (const el of elements) {
			el.classList[fn]('moveHighlight');
		}
	}
</script>

<div class="line {side === 'a' ? 'colA' : 'colB'}" style={`grid-row: ${lineNumber}`}>
	<div class="flex">
		<Button color="gray" override={{
			height: LINE_HEIGHT,
			'min-width': '50px',
			borderRadius: 0
		}}>
			{lineNumber}
		</Button>

		{#each chunks as chunk, i}
			{@const isMove = chunk.type === RenderInstruction.move}
			{@const id = isMove ? chunk.moveNumber : ''}
			<div
				data-move-id={id}
				on:mouseover={() => highlightMove(isMove, id, 'on')}
				on:focus={() => highlightMove(isMove, id, 'on')}
				on:mouseleave={() => highlightMove(isMove, id, 'off')}
				on:focusout={() => highlightMove(isMove, id, 'off')}
				class="flex"
			>
				<Prism code={chunk.text} language="ts" copy={false} override={getStyles(chunk.type)} />
			</div>
		{/each}
	</div>
</div>

<!-- This empty element is here so that I can attack the "moveHighlight" class to it, otherwise the compiler won't realize it's been used and it will optimize it away :S -->
<div class="invisible moveHighlight" />

<style>
	.line {
		background-color: #141517;
	}

	.moveHighlight {
		background-color: #ffeb3bba !important;
	}
	.colA {
		grid-column: 1;
		width: 100%;
	}

	.colB {
		grid-column: 2;
		width: 100%;
	}

	.invisible {
		height: 0;
		display: none;
	}
</style>
