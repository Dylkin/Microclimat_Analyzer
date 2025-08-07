import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
    Buffer: 'globalThis.Buffer'
  },
  optimizeDeps: {
    include: [
      'd3-array',
      'd3-scale',
      'd3-scale-chromatic',
      'd3-selection',
      'd3-time-format',
      'd3-zoom',
      'buffer'
    ],
  },
  resolve: {
    alias: {
      buffer: path.resolve(__dirname, 'node_modules/buffer/index.js'),
    },
  },
  server: {
    port: 5173,
    host: true
  },
})