import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'docx-templates',
      'chart.js',
      'react-chartjs-2',
      'html-to-image',
      'file-saver',
      'zod',
      'react-hook-form',
      '@hookform/resolvers/zod'
    ],
  },
  server: {
    port: 5173,
    host: true
  },
})