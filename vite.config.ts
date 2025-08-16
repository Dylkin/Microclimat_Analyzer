import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'Buffer': 'buffer/index.js',
  },
  optimizeDeps: {
    include: [
      'd3-array',
      'd3-scale',
      'd3-scale-chromatic',
      'd3-selection',
      'd3-time-format',
      'd3-zoom',
      'pizzip',
      'docxtemplater',
      'docxtemplater-image-module',
      'buffer'
    ],
    exclude: [
      'docxtemplater-table-module'
    ],
  },
  server: {
    port: 5173,
    host: true
  },
})