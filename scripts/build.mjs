import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build as viteBuild } from 'vite';
import JavaScriptObfuscator from 'javascript-obfuscator';

await viteBuild();

const htmlOutputPath = path.resolve('dist/index.html');
const htmlOutput = (await readFile(htmlOutputPath, 'utf8')).replace(/\r\n?/g, '\n');
await writeFile(htmlOutputPath, htmlOutput, 'utf8');

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

const [sourceHtml, sourceJavaScript, builtHtml] = await Promise.all([
  readFile(path.resolve('src/index.html'), 'utf8'),
  readFile(path.resolve('src/script.js'), 'utf8'),
  readFile(path.resolve('dist/index.html'), 'utf8'),
]);

for (const id of [
  'preloader',
  'bootScreen',
  'loginScreen',
  'welcomeScreen',
  'desktop',
  'windowLayer',
  'aboutTemplate',
  'resumeTemplate',
  'projectsTemplate',
  'contactTemplate',
]) {
  if (!sourceHtml.includes(`id="${id}"`)) {
    throw new Error(`Required portfolio markup is missing from src/index.html: ${id}`);
  }
}

const listenerCount = (sourceJavaScript.match(/\.addEventListener\s*\(/g) ?? []).length;
if (listenerCount === 0) {
  throw new Error('No application event listeners were found in src/script.js.');
}

const builtBody = builtHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1];
if (builtBody === undefined || builtBody.trim() !== '') {
  throw new Error('dist/index.html must contain an empty body shell.');
}

if (/<\!--|<div\b|<template\b/i.test(builtBody)) {
  throw new Error('Portfolio markup or comments remain in the built HTML body.');
}
