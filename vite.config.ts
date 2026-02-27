import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5180,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('hls.js')) return 'hls';
          if (id.includes('react-router-dom')) return 'router';
          if (id.includes('health_verified.json')) return 'data-channels';
        },
      },
    },
  },
})
