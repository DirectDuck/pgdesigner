import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-flow': ['@vue-flow/core', '@vue-flow/minimap'],
          'reka-ui': ['reka-ui'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/rpc': {
        target: 'http://127.0.0.1:9990',
        changeOrigin: true,
      },
    },
  },
})
