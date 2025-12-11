import * as Sentry from '@sentry/nextjs';

// Export required hooks for Next.js 15 compatibility
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV,

  // Ignore known third-party SDK errors that are harmless
  ignoreErrors: [
    // Chatwoot SDK race condition on Mobile Safari
    /getAppFrame/,
    /null is not an object \(evaluating '[^']*\.contentWindow'\)/,
    /null is not an object \(evaluating '[^']*\.parentNode'\)/,
    // Generic third-party script errors
    /Script error\.?/,
  ],

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
    // ============================================================
    // CHATWOOT SDK ERROR FILTER (Mobile Safari race condition)
    // ============================================================
    // The Chatwoot SDK has a known race condition on Mobile Safari where
    // it tries to access contentWindow on an iframe before it's ready.
    // These errors are harmless (widget still works) but noisy in Sentry.
    // Error: "null is not an object (evaluating 'g.getAppFrame().contentWindow')"
    // Stack: sendMessage/toggleCloseButton in packs/js/sdk.js
    const errorMessage = event.exception?.values?.[0]?.value || '';
    const errorStack = event.exception?.values?.[0]?.stacktrace?.frames
      ?.map(f => f.filename || '')
      .join(' ') || '';

    const isChatwootError =
      errorMessage.includes('getAppFrame') ||
      errorMessage.includes('contentWindow') ||
      errorMessage.includes('parentNode') ||
      errorStack.includes('sdk.js') ||
      errorStack.includes('packs/js/sdk');

    if (isChatwootError) {
      // Drop this error entirely - don't send to Sentry
      return null;
    }
    // ============================================================

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
