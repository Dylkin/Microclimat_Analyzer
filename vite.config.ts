import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'docxtemplater-table-module': 'docxtemplater-table-module/index.js'
    }
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    'Buffer': 'buffer/index.js',
    'buffer': 'buffer',
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
      'buffer',
      'docxtemplater-table-module'
    ],
    exclude: [
    ],
  },
  server: {
    port: 5173,
    host: true
  },
})