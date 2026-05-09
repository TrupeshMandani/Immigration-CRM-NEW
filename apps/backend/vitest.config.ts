import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    // Integration tests hit a real DB — run serially to avoid connection pool noise
    pool: 'forks',
    singleFork: true,
  },
});
