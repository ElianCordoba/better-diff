import { sveltekit } from "@sveltejs/kit/vite";

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  ssr: {
    optimizeDeps: { needsInterop: true, include: "../src" },
  },
};

export default config;
