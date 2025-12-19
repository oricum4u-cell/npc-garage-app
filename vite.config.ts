
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    devSourcemap: false, // Disable CSS source maps to prevent Ngrok 404s/MIME errors
  },
  build: {
    sourcemap: false, // Disable JS source maps to prevent large download errors
  },
  define: {
    'process.env': {} // Fallback for process.env
  },
  server: {
    // Allow access from any host (required for ngrok)
    allowedHosts: true,
    // Listen on all local IP addresses
    host: true,
    // PROXY: Redirects backend requests internally, removing need for second ngrok tunnel
    proxy: {
      '/sync': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/ping': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/active-sessions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})