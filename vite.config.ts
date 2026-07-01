import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Toda requisição para /api será redirecionada internamente para o nosso Back-end
      '/api': {
        target: 'https://euroespid.onrender.com',
        changeOrigin: true,
      }
    }
  }
})