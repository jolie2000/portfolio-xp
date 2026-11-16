import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build as viteBuild } from 'vite';
import JavaScriptObfuscator from 'javascript-obfuscator';

await viteBuild();

async function obfuscateJavaScript(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await obfuscateJavaScript(filePath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const source = await readFile(filePath, 'utf8');
      const result = JavaScriptObfuscator.obfuscate(source, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.65,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.25,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 8,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.8,
        sourceMap: false,
      });
      await writeFile(filePath, result.getObfuscatedCode(), 'utf8');
    }
  }
}

await obfuscateJavaScript(path.resolve('dist'));
await mkdir(path.resolve('dist'), { recursive: true });
await writeFile(path.resolve('dist/.nojekyll'), '', 'utf8');
