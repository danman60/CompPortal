import * as Sentry from '@sentry/nextjs';

// Export required hooks for Next.js 15 compatibility
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay configuration for session replay
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter sensitive data before sending to Sentry
  beforeSend(event) {
    // Remove all cookies (may contain session tokens)
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    // Remove authorization headers
    if (event.request?.headers?.Authorization) {
      delete event.request.headers.Authorization;
    }
    if (event.request?.headers?.authorization) {
      delete event.request.headers.authorization;
    }

    // Scrub potential PII from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        // Remove data from breadcrumbs that might contain PII
        if (breadcrumb.category === 'console' && breadcrumb.message) {
          // Redact email patterns
          breadcrumb.message = breadcrumb.message.replace(
            /[\w.-]+@[\w.-]+\.\w+/g,
            '[REDACTED_EMAIL]'
          );
        }
        return breadcrumb;
      });
    }

    return event;
  },
});
