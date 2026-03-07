import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://35.154.220.105:8080',
        // target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
