import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Point to the request config file
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['@heroui/react', '@heroui/theme'],
  // Exclude packages that should only run on server
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  },
  webpack: (config, { isServer }) => {
    // Ignore test files in node_modules
    config.plugins = config.plugins || [];
    const { IgnorePlugin } = require('webpack');
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /\.test\.(js|ts|tsx|mjs)$/,
        contextRegExp: /node_modules/,
      }),
      // Also ignore test directories
      new IgnorePlugin({
        resourceRegExp: /\/test\//,
        contextRegExp: /node_modules/,
      })
    );
    
    return config;
  },
};

export default withNextIntl(nextConfig);
