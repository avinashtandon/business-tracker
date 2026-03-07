import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://13.235.42.247:8080',
        // target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
