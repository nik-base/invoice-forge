import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // No globals — all tests use explicit imports from 'vitest'
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.bench.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'lcov'],
    },
    benchmark: {
      include: ['tests/**/*.bench.ts'],
    },
  },
});
