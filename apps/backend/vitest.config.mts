import { defineConfig } from 'vitest/config';

// Only the pure discount-rule modules are covered here — anything that talks to
// Supabase or Nest is exercised through the manual verification steps instead.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});
