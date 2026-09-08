import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Só test/: o kit não tem o `tests/` (suíte de ingestão) do repo de origem.
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
