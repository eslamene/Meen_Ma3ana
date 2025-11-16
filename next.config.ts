import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// Point to the request config file
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Allow builds to proceed with ESLint errors
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@heroui/react', '@heroui/theme'],
};

export default withNextIntl(nextConfig);
