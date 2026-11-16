import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./src/', import.meta.url)),
  // Relative URLs work both on the GitHub Pages project path and locally.
  base: './',
  publicDir: fileURLToPath(new URL('./public/', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('./dist/', import.meta.url)),
    emptyOutDir: true,
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/index.html', import.meta.url)),
    },
  },
});
