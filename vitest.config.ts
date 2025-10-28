import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/cli.ts', // Исключаем CLI (требует интеграционных тестов)
        'src/ui/prompts.ts', // UI требует интеграционных тестов
        'src/core/git.ts', // Git операции требуют интеграционных тестов
        'src/__tests__/**', // Тестовые файлы
      ],
    },
  },
});
