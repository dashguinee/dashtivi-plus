import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Read version from version.json — stamped into app at build time
const versionData = JSON.parse(fs.readFileSync('public/version.json', 'utf8'));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(versionData.version),
  },
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('hls.js')) return 'hls';
          if (id.includes('mpegts.js')) return 'mpegts';
          if (id.includes('logo-map.generated')) return 'logo-data';
          if (id.includes('tmdb-map.generated')) return 'tmdb-data';
          if (id.includes('react-router-dom')) return 'router';
        },
      },
    },
  },
})
