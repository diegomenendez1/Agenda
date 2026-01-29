import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api/auto-process': {
          target: env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/auto-process/, ''),
        },
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        }
      }
    }
  }
})