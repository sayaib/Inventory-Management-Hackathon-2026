import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/xlsx/') || id.endsWith('/xlsx')) return 'xlsx';
          if (id.includes('/react-router-dom/') || id.includes('/react-router/')) return 'react-router';
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
})
