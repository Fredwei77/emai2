import { defineConfig } from 'vite'
import { resolve } from 'path'

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
        contact: resolve(__dirname, 'src/contact.html')
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