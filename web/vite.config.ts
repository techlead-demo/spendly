import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const webPort = Number(process.env.WEB_PORT ?? 5101);
const apiPort = Number(process.env.API_PORT ?? 5102);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
  preview: {
    port: webPort,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
});
