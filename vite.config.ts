import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      events: path.resolve(__dirname, 'node_modules/events'),
      stream: path.resolve(__dirname, 'node_modules/stream-browserify')
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
      'd3-array',
      'd3-scale',
      'd3-scale-chromatic',
      'd3-selection',
      'd3-time-format',
      'd3-zoom',
      'html-to-docx',
      'docx-templates',
    ],
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