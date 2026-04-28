import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';

import { rssPlugin } from './src/plugins/rss';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1000,
  },
  plugins: [react(), tailwindcss(), rssPlugin()],
  server: {
    open: true,
    port: 3000,
    allowedHosts: ['.trycloudflare.com'],
  },
  resolve: { alias: { src: path.resolve(__dirname, './src') } },
});
