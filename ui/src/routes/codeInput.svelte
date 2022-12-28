<script lang="ts">
  import { Input } from '@svelteuidev/core';

  export let code: string = ""
</script>

<textarea bind:value={code} class="codeArea"></textarea>

<style>
  .codeArea {
    height: 150px;
    background-color: rgb(200, 200, 200);
    margin: 20px;
  }

</style>

<!-- <Input bind:value={code} variant='unstyled' override={{ backgroundColor: "$gray700", inner: 150}} m={20}/> -->