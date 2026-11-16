import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const sourceHtml = fileURLToPath(new URL('./src/index.html', import.meta.url));
const sourceScript = fileURLToPath(new URL('./src/script.js', import.meta.url));

function extractBodyMarkup() {
  let bodyMarkup;

  return {
    name: 'extract-body-markup',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i);
        if (!bodyMatch) {
          throw new Error('Could not find the source <body> in src/index.html.');
        }

        const entryScript = bodyMatch[1].match(
          /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["'][^"']*script\.js["'])[^>]*>\s*<\/script>/i,
        );
        if (!entryScript) {
          throw new Error('Could not find the module entry script inside the source body.');
        }

        bodyMarkup = bodyMatch[1].replace(entryScript[0], '');
        const shell = html.replace(bodyMatch[0], '<body></body>');
        return shell.replace(/<\/head\s*>/i, `${entryScript[0]}\n</head>`);
      },
    },
    transform(code, id) {
      const cleanId = id.split('?')[0].replaceAll('\\', '/');
      const cleanSourceScript = sourceScript.replaceAll('\\', '/');
      if (cleanId !== cleanSourceScript) return null;
      if (bodyMarkup === undefined) {
        throw new Error('Body markup was not extracted before transforming the JavaScript entry.');
      }

      return `document.body.innerHTML = ${JSON.stringify(bodyMarkup)};\n${code}`;
    },
  };
}

export default defineConfig({
  plugins: [extractBodyMarkup()],
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
      input: sourceHtml,
    },
  },
});
