import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // união: suíte de ingestão (tests/, Épicos A/B/C) + suíte do topic engine (test/, Épico D)
    include: ['test/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
