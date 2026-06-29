import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/fx': 'http://localhost:8400',
      '/agent': 'http://localhost:8400',
      '/health': 'http://localhost:8400',
    },
  },
  build: {
    outDir: 'dist',
  },
})
