/**
 * Build pipeline for @wwskills/dsh-long-memory.
 *
 * Four passes keep `lib/` a complete, self-consistent build output:
 *
 *   1. Host bundle — src/index.ts → lib/index.js (esbuild, host DSH/cordis
 *      packages stay external; the DSH profile's node_modules provides them
 *      at runtime).
 *   2. Invariant bundle — src/invariant.ts → lib/invariant.js (the package's
 *      separate `./invariant` export entry).
 *   3. Per-module pass — every other top-level src/*.ts is transformed (types
 *      stripped, relative imports preserved) to lib/<name>.js. The legacy test
 *      scripts under scripts/ import these module paths directly, and this pass
 *      keeps them byte-in-sync with the TypeScript sources instead of drifting.
 *   4. Client bundle — src/client/index.tsx is bundled to lib/client.js as a
 *      classic factory script wrapped in `window.__ModuleLoader__.load(...)`;
 *      react / jsx-runtime and the DSH client UI packages stay external (the
 *      shell injects them at runtime), mirroring dsh-kb's build.mjs.
 *
 * Declarations are emitted separately by tsc (esbuild strips types).
 */
import { build } from 'esbuild'
import { mkdirSync, readdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const PACKAGE_ID = '@wwskills/dsh-long-memory'
const PACKAGE_ROOT = new URL('..', import.meta.url)
const SRC_DIR = new URL('src', PACKAGE_ROOT)

mkdirSync('lib', { recursive: true })

// Host side: DSH/cordis peer packages resolve from node_modules at runtime.
// js-yaml is resolved at runtime through createRequire — keep it external so
// DSH's bundled copy is used when present.
const hostExternal = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-*',
  '@deepseek-ai/schemastery',
  'js-yaml',
]

/** Strip absolute build-machine paths esbuild stamps into inlined markers. */
async function stripMachinePaths(outfile) {
  const code = await readFile(outfile, 'utf8')
  const cleaned = code.replace(/^(\s*\/\/\s*)[A-Za-z]:[\\/][^\\/\r\n]*[\\/][^\\/\r\n]*[\\/]/gm, '$1dsh/')
  if (cleaned !== code) await writeFile(outfile, cleaned)
  try {
    const map = JSON.parse(await readFile(`${outfile}.map`, 'utf8'))
    if (Array.isArray(map.sources)) {
      const rewritten = map.sources.map(source =>
        source.startsWith('file:///')
          ? source.replace(/^file:\/\/\/[A-Za-z]:[\\/][^\\/]+[\\/][^\\/]+[\\/]/, 'dsh/')
          : source)
      if (rewritten.some((source, index) => source !== map.sources[index])) {
        map.sources = rewritten
        await writeFile(`${outfile}.map`, JSON.stringify(map))
      }
    }
  } catch {
    // No sourcemap present.
  }
}

// ── Pass 1: host entry bundle ───────────────────────────────────────────────
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: hostExternal,
  logLevel: 'info',
})
await stripMachinePaths('lib/index.js')

// ── Pass 2: invariant entry bundle (separate package export) ────────────────
await build({
  entryPoints: ['src/invariant.ts'],
  outfile: 'lib/invariant.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: hostExternal,
  logLevel: 'info',
})
await stripMachinePaths('lib/invariant.js')

// ── Pass 3: per-module transform (flat lib layout the scripts import) ───────
// Only top-level src/*.ts modules; the client/ subtree is a separate bundle.
const reserved = new Set(['index.ts', 'invariant.ts'])
const moduleEntries = []
for (const name of readdirSync(SRC_DIR)) {
  if (!name.endsWith('.ts') || name.endsWith('.d.ts') || reserved.has(name)) continue
  moduleEntries.push(`src/${name}`)
}
if (moduleEntries.length > 0) {
  await build({
    entryPoints: moduleEntries,
    outdir: 'lib',
    bundle: false, // strip types only — keep './xxx.js' relative imports intact
    format: 'esm',
    platform: 'node',
    target: ['node22'],
    sourcemap: true,
    logLevel: 'info',
  })
  for (const entry of moduleEntries) {
    const out = `lib/${entry.slice('src/'.length).replace(/\.ts$/, '.js')}`
    await stripMachinePaths(out)
  }
}

// ── Pass 4: client bundle (browser factory, wrapped for the module loader) ──
const clientExternal = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-locale',
]
await build({
  entryPoints: ['src/client/index.tsx'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: true,
  jsx: 'automatic',
  external: clientExternal,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {\nvar module = { exports: {} };\n`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})
await stripMachinePaths('lib/client.js')

// esbuild strips types, so declarations are emitted separately by tsc.
execFileSync(
  process.execPath,
  [fileURLToPath(import.meta.resolve('typescript/bin/tsc')), '-p', 'tsconfig.build.json'],
  { stdio: 'inherit' },
)
