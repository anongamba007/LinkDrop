import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // This ensures assets are loaded correctly in production
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // Helps with debugging
    rollupOptions: {
      output: {
        manualChunks: undefined // Ensures single bundle for simpler deployment
      }
    }
  }
})
