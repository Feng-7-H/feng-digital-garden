import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // 修复多 lockfile 环境下 workspace root 推断错误（系统根目录存在 /pnpm-lock.yaml）
  outputFileTracingRoot: process.cwd(),
  /* config options here */
  webpack: (config, { dev }) => {
    if (dev && config.cache && config.cache.type === 'filesystem') {
      config.cache.cacheDirectory = path.resolve(
        'node_modules/.cache/next-webpack',
      );
    }
    return config;
  },
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
