<script lang="ts">
	export let code: string = '';
</script>

<textarea bind:value={code} class="codeArea" />

<style>
	.codeArea {
		height: 150px;
		background-color: rgb(200, 200, 200);
		margin: 20px;
	}
</style>
