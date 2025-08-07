import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
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
      'chartjs-adapter-date-fns'
    ],
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  server: {
    port: 5173,
    host: true
  },
})