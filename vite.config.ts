import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    process: {}
  },
  server: {
    port: 5173,
    host: true
  },
  worker: {
    format: 'es'
  }
})