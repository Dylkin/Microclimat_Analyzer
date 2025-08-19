import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
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
      'buffer'
    ],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false,
    hmr: {
      port: 3001,
      host: '0.0.0.0',
      clientPort: 3001
    }
  },
})