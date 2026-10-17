import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          // Override with VITE_API_PROXY_TARGET in frontend/.env.local when the
          // API runs on another port (e.g. macOS AirPlay already holds 5000).
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
          changeOrigin: true
        },
        // Uploaded files are served by the backend from its uploads folder.
        '/uploads': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
          changeOrigin: true
        }
      }
    }
  }
})
