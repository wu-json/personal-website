import * as path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'build' },
  plugins: [react()],
  server: {
    open: true,
    port: 3000,
  },
  resolve: { alias: { src: path.resolve(__dirname, './src') } },
});
