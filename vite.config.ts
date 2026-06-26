import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Toda requisição para /api será redirecionada internamente para o nosso Back-end
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})