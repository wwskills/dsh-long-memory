import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // DSH peer packages are host-supplied; point them at inert stubs so the
      // module-scope schema building in src/index.ts works under vitest.
      '@deepseek-ai/schemastery': `${here}tests/stubs/schemastery.js`,
      '@deepseek-ai/dsh-tools': `${here}tests/stubs/dsh-tools.js`,
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
  },
})
