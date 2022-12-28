<script lang='ts'>
  import { Group, Button } from '@svelteuidev/core';
  import { Prism } from '@svelteuidev/prism'

  export let lineNumber: number = -1;
  export let code: string | undefined;

  const HEIGHT = 35;

  const lineNumberClass = {
    height: HEIGHT,
    "min-width": "50px",
    "padding": "0px 10px",
    "justify-content": "flex-end",
    "borderRadius": 0
  }
  

</script>

<Group override={{ borderRadius: 0, width: "100%", gap:0 }}>
  <Button color="gray" compact override={lineNumberClass}>
    {lineNumber}  
  </Button>

  {#if code}
    <!-- TODO: Lang ts doesn't work -->
    <Prism 
      {code}
      language="js" 
      copy={false}
      override={{ width:'90%', height:HEIGHT , paddingLeft: 20 }}
    />
  {:else}
    EMPTY
  {/if}
  
</Group>

