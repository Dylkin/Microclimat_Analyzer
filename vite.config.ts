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
      'd3-array',
      'd3-scale',
      'd3-scale-chromatic',
      'd3-selection',
      'd3-time-format',
      'd3-zoom',
      'html-to-docx',
    ],
    exclude: [
    ],
  },
  server: {
    port: 5173,
    host: true
  },
})