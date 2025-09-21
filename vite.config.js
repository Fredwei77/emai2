import { defineConfig } from 'vite'
import path, { resolve } from 'path'
import { fileURLToPath } from 'url'

// __dirname is not available in ESM; derive it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        about: resolve(__dirname, 'src/about.html'),
        services: resolve(__dirname, 'src/services.html'),
        contact: resolve(__dirname, 'src/contact.html'),
        terms: resolve(__dirname, 'src/terms.html'),
        privacy: resolve(__dirname, 'src/privacy.html'),
        ai: resolve(__dirname, 'src/ai.html'),
        serviceDetail: resolve(__dirname, 'src/service-detail.html'),
        uiPreview: resolve(__dirname, 'src/ui-preview.html')
      }
    }
  },
  publicDir: '../public',
  server: {
    port: 3001,
    strictPort: true,
    open: true,
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8999',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:8999',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions')
      }
    }
  }
})