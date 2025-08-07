import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  resolve: {
    alias: {
      'node:fs': 'fs',
      'node:path': 'path-browserify',
      'node:url': 'url',
      'fs': 'memfs',
      'path': 'path-browserify',
      'stream': 'stream-browserify',
      'util': 'util',
      'buffer': 'buffer',
      'process': 'process/browser'
    }
  },
  optimizeDeps: {
    include: [
      'docx-templates',
      'file-saver',
      'buffer',
      'process',
      'stream-browserify',
      'path-browserify',
      'util'
    ]
  },
  server: {
    port: 5173,
    host: true
  },
})