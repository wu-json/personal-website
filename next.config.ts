import type { NextConfig } from 'next';

import path from 'path';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Mirrors the Vite dev server's allowedHosts so `next dev` accepts
  // Host headers from Cloudflare quick tunnels.
  allowedDevOrigins: ['*.trycloudflare.com'],
  webpack: config => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      src: path.resolve(__dirname, 'src'),
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      src: './src',
    },
  },
};

export default nextConfig;
