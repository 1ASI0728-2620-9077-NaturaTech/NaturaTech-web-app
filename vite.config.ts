/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://plantsync-backend-a8c5cbd9c5bggfg3.mexicocentral-01.azurewebsites.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
