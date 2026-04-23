import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'build',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: id => {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) {
            return 'three';
          }
          if (
            /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)
          ) {
            return 'react';
          }
          if (
            /[\\/]node_modules[\\/](react-markdown|remark-.*|rehype-.*|micromark.*|mdast-.*|unist-.*|hast-.*|unified|vfile.*|bail|trough|devlop|decode-named-character-reference|character-entities.*|property-information|space-separated-tokens|comma-separated-tokens|ccount|escape-string-regexp|longest-streak|markdown-table|zwitch)[\\/]/.test(
              id,
            )
          ) {
            return 'markdown';
          }
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
    port: 3000,
  },
  resolve: { alias: { src: path.resolve(__dirname, './src') } },
});
