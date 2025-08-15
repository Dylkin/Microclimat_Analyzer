import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': '{}',
    process: '{ env: {} }',
    Buffer: 'globalThis.Buffer',
  },
  optimizeDeps: {
    include: [
      'd3-array',
      'stream-browserify',
      'd3-scale',
      'd3-scale-chromatic',
      'd3-selection',
      'd3-time-format',
      'd3-zoom',
      'html-to-docx',
      'docx-templates'
    ],
  },
  build: {
    commonjsOptions: {
      include: [
        /node_modules/
      ]
      events: 'events',
      stream: 'stream-browserify'
    }
  },
  server: {
    port: 5173,
    host: true
  },
})