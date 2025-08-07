import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      vm: 'vm-browserify'
    }
  },
  optimizeDeps: {
    include: ['docx-templates']
  },
  server: {
    port: 5173,
    host: true
  },
  worker: {
    format: 'es'
  }
})