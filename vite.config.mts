import * as path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { markdownPlugin } from './src/plugins/markdown.ts';
import { ogPlugin } from './src/plugins/og.ts';
import { pixelFontPlugin } from './src/plugins/pixelFont.ts';
import { rssPlugin } from './src/plugins/rss.ts';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    markdownPlugin(),
    react(),
    tailwindcss(),
    pixelFontPlugin(),
    rssPlugin(),
    ogPlugin(),
  ],
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei/core/PointerLockControls',
    ],
  },
  server: {
    open: true,
    port: 3000,
    allowedHosts: ['.trycloudflare.com'],
    warmup: {
      clientFiles: [
        './src/index.tsx',
        './src/screens/Exhibition/index.tsx',
        './src/screens/Gallery/index.tsx',
      ],
    },
  },
  resolve: { alias: { src: path.resolve(import.meta.dirname, './src') } },
});
