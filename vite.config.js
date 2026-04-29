import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'capacitor' ? '/' : '/ryadom/',
  server: {
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    include: ['@vkontakte/vk-bridge'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}))
