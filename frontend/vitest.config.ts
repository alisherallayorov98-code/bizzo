import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@':           path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages':      path.resolve(__dirname, './src/pages'),
      '@hooks':      path.resolve(__dirname, './src/hooks'),
      '@utils':      path.resolve(__dirname, './src/utils'),
      '@services':   path.resolve(__dirname, './src/services'),
      '@store':      path.resolve(__dirname, './src/store'),
      '@types':      path.resolve(__dirname, './src/types'),
      '@config':     path.resolve(__dirname, './src/config'),
      '@features':   path.resolve(__dirname, './src/features'),
      '@assets':     path.resolve(__dirname, './src/assets'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/node_modules/**', 'src/__tests__/**', '**/*.config.*', 'dist/**'],
    },
  },
})
