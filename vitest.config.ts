import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Testes de lógica pura/helpers (sem I/O). Ambiente node — nada de DOM.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
