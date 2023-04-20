import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
console.log(window)
window.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    if (label === 'json') return new JsonWorker()
    if (label === 'css') return new CssWorker()
    if (label === 'html') return new HtmlWorker()
    return new EditorWorker()
  }
}

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: 'typescript',
  theme: 'vs-dark',
  minimap: {
    enabled: false
  }
}

monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true,
});

export function createEditor(elementId: string, code: string) {
  monaco.editor.create(document.getElementById(elementId)!, {
    value: code,

    ...editorOptions
  });
}