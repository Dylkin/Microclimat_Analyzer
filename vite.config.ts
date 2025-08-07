import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.browser': true,
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      stream: 'stream-browserify',
      path: 'path-browserify',
      util: 'util',
      events: 'events',
      vm: 'src/utils/vm-stub.js', // Заглушка для vm модуля
    },
  },
  optimizeDeps: {
    include: [
      'chart.js',
      'react-chartjs-2',
      'docx-templates',
      'html-to-image',
      'file-saver',
      'zod',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'chartjs-adapter-date-fns',
      'buffer',
      'process/browser',
      'stream-browserify',
      'path-browserify',
      'util',
      'events'
    ],
  },
  server: {
    port: 5173,
    host: true
  },
})