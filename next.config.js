const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for better deployment
  output: 'standalone',

  // Fix workspace root warning with multiple lockfiles
  outputFileTracingRoot: __dirname,

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

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,

  // Upload source maps to Sentry
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production
  disabled: process.env.NODE_ENV !== 'production',
};

// Export wrapped config
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
