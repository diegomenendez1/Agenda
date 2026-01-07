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
          target: env.VITE_N8N_WEBHOOK_URL,
          changeOrigin: true,
          secure: false,
          rewrite: () => '', // Send request to target directly, ignoring /api/auto-process path
        }
      }
    }
  }
})
