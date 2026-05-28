import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: (mode === 'capacitor' || mode === 'firebase') ? '/' : '/ryadom/',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      external: mode === 'capacitor' ? [] : [
        '@capacitor/geolocation',
        '@capacitor/camera',
        '@capacitor/app',
      ],
    },
  },
}))
