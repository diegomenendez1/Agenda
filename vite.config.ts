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
          target: env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678', // Fallback to avoid crash, but will likely 404 if not set
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            // Robust rewrite: Ensure we don't end up with double slashes or missing slashes
            return path.replace(/^\/api\/auto-process/, '');
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        }
      }
    }
  }
})
