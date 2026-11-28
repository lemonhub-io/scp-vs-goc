import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';
import { defineConfig } from 'vite';

async function listFiles(root, directory = '') {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = directory ? directory + '/' + entry.name : entry.name;
    return entry.isDirectory() ? listFiles(root, path) : [path];
  }));
  return files.flat();
}

function offlineBuild() {
  return {
    name: 'site109-offline',
    apply: 'build',
    // Vite loads ESM during development. The single production IIFE also runs from file://.
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/<script type="module"(?: crossorigin)? src="([^"]+)"><\/script>/, '<script defer src="$1"></script>');
      },
    },
    async writeBundle({ dir }) {
      const source = await readFile(new URL('./src/worker/sw.ts', import.meta.url), 'utf8');
      const paths = (await listFiles(dir)).filter(path => path !== 'sw.js').sort();
      const revision = createHash('sha256').update(source);
      for (const path of paths) {
        const bytes = await readFile(resolve(dir, path));
        revision.update(JSON.stringify(path)).update(createHash('sha256').update(bytes).digest());
      }

      const worker = ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None, alwaysStrict: true,
        },
      }).outputText
        .replace('__SITE109_REVISION__', JSON.stringify(revision.digest('hex').slice(0, 16)))
        .replace('__SITE109_ASSETS__', JSON.stringify(paths));
      await writeFile(resolve(dir, 'sw.js'), worker);
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    modulePreload: false,
    rolldownOptions: { output: { format: 'iife', codeSplitting: false } },
  },
  plugins: [offlineBuild()],
});
