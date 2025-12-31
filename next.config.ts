import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Point to the request config file
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['@heroui/react', '@heroui/theme'],
  // Exclude packages that should only run on server
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ]
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
