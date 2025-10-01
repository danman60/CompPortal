/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for better deployment
  output: 'standalone',

  // Ensure static HTML files in root still work
  trailingSlash: false,

  // TypeScript and ESLint config
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
