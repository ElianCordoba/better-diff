import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const prefix = `monaco-editor/esm/vs`;
export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 3000
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					jsonWorker: [`${prefix}/language/json/json.worker`],
					cssWorker: [`${prefix}/language/css/css.worker`],
					htmlWorker: [`${prefix}/language/html/html.worker`],
					tsWorker: [`${prefix}/language/typescript/ts.worker`],
					editorWorker: [`${prefix}/editor/editor.worker`],
				},
			},
		},
	},
});


