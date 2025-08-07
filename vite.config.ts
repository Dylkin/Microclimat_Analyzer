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
      'chart.js',
      'react-chartjs-2',
      'html-to-image',
      'file-saver',
      'zod',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'chartjs-adapter-date-fns',
      'docx-templates'
    ],
  },
  server: {
    port: 5173,
    host: true
  },
})