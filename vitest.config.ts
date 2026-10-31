import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 30000, // 30 seconds for CI environments
    hookTimeout: 30000, // 30 seconds for setup/teardown hooks
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/server/services/**/*.ts',
        'src/server/controllers/**/*.ts',
        'src/server/repositories/**/*.ts',
        'src/server/middleware/**/*.ts',
        'src/lib/**/*.ts',
        'src/components/**/*.tsx',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/node_modules/**',
        '**/dist/**',
        '**/__tests__/**',
        'src/server/server.ts',
        'src/server/app.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
        // Higher thresholds for critical logic
        'src/server/services/**': {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        'src/lib/**': {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@server': path.resolve(import.meta.dirname, './src/server'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@client': path.resolve(import.meta.dirname, './src/client'),
      '@components': path.resolve(import.meta.dirname, './src/components'),
    },
  },
});
