import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY || 'http://localhost:8001'
  return {
    plugins: [react()],
    esbuild: { sourcemap: false },
    server: {
      port: 3002,
      host: '0.0.0.0',
      allowedHosts: true,
      strictPort: true,
      sourcemapIgnoreList: () => true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
