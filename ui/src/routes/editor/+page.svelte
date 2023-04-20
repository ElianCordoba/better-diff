<script>
  import { onMount } from 'svelte'
  import { createEditor } from './monaco'

  onMount(() => {
    createEditor('editor-1', 'console.log("asd")')
    createEditor('editor-2', 'console.log("1111")')
  })

  console.log(2)
  

</script>

<div class="editor-container">
  <div id="editor-1" class="editor"></div>
  <div id="editor-2" class="editor"></div>
</div>


<style>
  .editor-container {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 500px;
  }

  .editor {
    flex: 1;
    height: 100%;
    /* margin-right: 10px; */
  }
</style>