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
      'd3-array',
      'd3-scale',
      'd3-scale-chromatic',
      'd3-selection',
      'd3-time-format',
      'd3-zoom',
      'pizzip',
      'html2canvas',
      'react',
      'react-dom'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('d3-')) {
              return 'd3-vendor';
            }
            if (id.includes('pizzip')) {
              return 'docx-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            return 'vendor';
          }
          
          // Feature chunks
          if (id.includes('src/components/analyzer')) {
            return 'analyzer';
          }
          if (id.includes('src/components/project-management')) {
            return 'project-management';
          }
          if (id.includes('src/components/contract-management')) {
            return 'contract-management';
          }
          if (id.includes('src/components/equipment-management')) {
            return 'equipment-management';
          }
          if (id.includes('src/components/testing-management')) {
            return 'testing-management';
          }
          if (id.includes('src/components/admin-panels')) {
            return 'admin-panels';
          }
          if (id.includes('src/utils/')) {
            return 'utils';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173,
    host: true
  },
})