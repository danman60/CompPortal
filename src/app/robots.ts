import { MetadataRoute } from 'next';

/**
 * Robots.txt configuration for search engine crawlers
 * Controls which pages search engines can index
 *
 * For a competition portal with authentication:
 * - Allow public pages (home, login, signup)
 * - Disallow authenticated areas (dashboard, admin)
 * - Disallow API endpoints
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://comp-portal-one.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/signup',
          '/reset-password',
        ],
        disallow: [
          '/dashboard/*',
          '/api/*',
          '/demo/*',
          '/onboarding',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
