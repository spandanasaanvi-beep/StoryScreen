import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxy = {
  target: process.env.STORYSCREEN_API_ORIGIN ?? 'http://127.0.0.1:3001',
  changeOrigin: true,
  timeout: 30_000,
  proxyTimeout: 30_000,
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: { '/api': apiProxy },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: { '/api': apiProxy },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
