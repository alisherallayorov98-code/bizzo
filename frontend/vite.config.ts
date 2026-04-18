import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
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
      '@i18n':       path.resolve(__dirname, './src/i18n'),
      '@locales':    path.resolve(__dirname, './src/locales'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    sourcemap: mode !== 'production',
    chunkSizeWarningLimit: 600,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'react-router'
            if (id.includes('react-dom') || id.match(/react[/\\]/)) return 'react-core'
            if (id.includes('@tanstack'))    return 'state-libs'
            if (id.includes('zustand'))      return 'state-libs'
            if (id.includes('lucide-react')) return 'ui-icons'
            if (id.includes('@radix-ui'))    return 'ui-libs'
            if (id.includes('recharts') || id.includes('d3')) return 'charts'
            if (id.includes('jspdf'))        return 'pdf-export'
            if (id.includes('xlsx'))         return 'excel-export'
            if (id.includes('date-fns'))     return 'utils'
            if (id.includes('react-hook-form') || id.includes('zod')) return 'forms'
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@tanstack/react-query', 'zustand', 'axios',
    ],
    exclude: ['jspdf', 'xlsx'],
  },
  css: {
    devSourcemap: mode !== 'production',
  },
}))
