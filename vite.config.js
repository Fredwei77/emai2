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
        contact: resolve(__dirname, 'src/contact.html'),
        ui: resolve(__dirname, 'src/ui-preview.html'),
        serviceDetail: resolve(__dirname, 'src/service-detail.html')
      }
    }
  },
  publicDir: '../public',
  server: {
    port: 3000,
    open: true
  }
})