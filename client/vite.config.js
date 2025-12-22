import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Charts library (large)
          'charts': ['recharts'],
          // Data fetching
          'query': ['@tanstack/react-query'],
          // Utilities
          'utils': ['axios', 'clsx', 'date-fns'],
          // Excel/PDF exports
          'export': ['xlsx', 'jspdf', 'jspdf-autotable'],
          // UI animations
          'animations': ['framer-motion'],
        },
      },
    },
  },
})

