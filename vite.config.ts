import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      stream: path.resolve(__dirname, 'node_modules/stream-browserify'),
      events: path.resolve(__dirname, 'node_modules/events')
    }
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
    process: '{ env: {} }',
    Buffer: 'globalThis.Buffer',
  },
  optimizeDeps: {
    include: [
      'docx',
      'd3-array',
      'd3-scale',
      'd3-scale-chromatic',
      'd3-selection',
      'd3-time-format',
      'd3-zoom',
      'docx-templates',
      'stream-browserify',
      'events'
    ]
  },
  build: {
    commonjsOptions: {
      include: [
        /node_modules/
      ]
    }
  },
  server: {
    port: 5173,
    host: true
  },
})