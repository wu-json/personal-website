import * as path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { markdownPlugin } from './src/plugins/markdown.ts';
import { ogPlugin } from './src/plugins/og.ts';
import { pixelFontPlugin } from './src/plugins/pixelFont.ts';
import { rssPlugin } from './src/plugins/rss.ts';

const DEV_STATIC_ASSET = /^\/(images|fonts)\//;
const DEV_STATIC_CACHE = 'public, max-age=3600';

const devStaticCache = (): Plugin => ({
  name: 'dev-static-cache',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && DEV_STATIC_ASSET.test(req.url)) {
        const setHeader = res.setHeader.bind(res);
        res.setHeader = (name, value) =>
          setHeader(
            name,
            name.toLowerCase() === 'cache-control' ? DEV_STATIC_CACHE : value,
          );
      }
      next();
    });
  },
});

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
    devStaticCache(),
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
        './src/SiteRoutes.tsx',
        './src/screens/Exhibition/index.tsx',
        './src/screens/Gallery/index.tsx',
      ],
    },
  },
  resolve: { alias: { src: path.resolve(import.meta.dirname, './src') } },
});
