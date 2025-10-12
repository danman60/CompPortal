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

  // CDN configuration
  ...(process.env.NEXT_PUBLIC_CDN_ENABLED === 'true' && process.env.NEXT_PUBLIC_CDN_URL
    ? {
        assetPrefix: process.env.NEXT_PUBLIC_CDN_URL,
        images: {
          domains: [
            new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname,
            'compsync.net',
            'localhost',
          ],
          remotePatterns: [
            {
              protocol: 'https',
              hostname: '**.cloudflare.com',
            },
            {
              protocol: 'https',
              hostname: '**.cloudfront.net',
            },
          ],
        },
      }
    : {
        images: {
          domains: ['compsync.net', 'localhost'],
        },
      }),

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
