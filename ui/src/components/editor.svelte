<script lang="ts">
  import * as monaco from 'monaco-editor';
  
  import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
	import { onMount } from 'svelte';

  // import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
  // import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
  // import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
  // import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'


  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
  });

  window.MonacoEnvironment = {
    // @ts-ignore
    getWorker(_: string, label: string) {
      if (label === 'typescript' || label === 'javascript') return new TsWorker()
      // if (label === 'json') return new JsonWorker()
      // if (label === 'css') return new CssWorker()
      // if (label === 'html') return new HtmlWorker()
      // return new EditorWorker()
    }
  }

  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    language: 'typescript',
    theme: 'vs-dark',
    minimap: {
      enabled: false
    },
  }

  let editor: monaco.editor.IStandaloneCodeEditor;

  export let elementId: string;
  export let value: string

  onMount(() => {
    editor = monaco.editor.create(document.getElementById(elementId)!, {
      value,
      ...editorOptions
    });

     editor.getModel()!.onDidChangeContent(() => {
      value = editor.getModel()!.getValue();
    });
  })

</script>

<div id={elementId} class="editor"></div>

<style>
  .editor {
    flex: 1;
    height: 100%;
  }
</style>