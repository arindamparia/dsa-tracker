/**
 * build.mjs — Production build script
 *
 * 1. Copies public/ → dist/  (preserves all assets, HTML, CSS, etc.)
 * 2. Minifies every .js file in dist/js/ with esbuild:
 *    - Strips whitespace and comments
 *    - Shortens local identifiers (variables, functions)
 *    - Simplifies constant expressions
 *    - NO bundling — ES module imports remain intact (each file is still separate)
 *    - NO source maps — prevents DevTools from showing readable source
 *
 * Run: node scripts/build.mjs
 * Netlify runs this automatically on every deploy (see netlify.toml).
 * Local dev (netlify dev) serves directly from public/ so you still get readable code.
 */

import { transform } from 'esbuild';
import { cp, readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';

const SRC  = 'public';
const DEST = 'dist';

console.log(`Building: ${SRC} → ${DEST}`);

// ── Step 1: Mirror public/ into dist/ ────────────────────────────────────────
await cp(SRC, DEST, { recursive: true, force: true });
console.log('  ✓ Copied static assets');

// ── Step 2: Minify every .js in dist/js/ ─────────────────────────────────────
const jsDir = join(DEST, 'js');
const files = (await readdir(jsDir)).filter(f => f.endsWith('.js'));

await Promise.all(files.map(async (file) => {
  const path = join(jsDir, file);
  const src  = await readFile(path, 'utf8');

  const { code } = await transform(src, {
    minify          : true,   // whitespace + identifiers + syntax
    format          : 'esm',  // keep ES module syntax (import/export)
    target          : 'es2020',
    sourcemap       : false,  // no source maps in production
    legalComments   : 'none', // strip all comments including licence headers
  });

  await writeFile(path, code);
}));

console.log(`  ✓ Minified ${files.length} JS files`);
console.log('Build complete.');
