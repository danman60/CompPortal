import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

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

    // Remove query parameters that might contain sensitive data
    if (event.request?.query_string && typeof event.request.query_string === 'string') {
      // Redact common sensitive query params
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
      let queryString = event.request.query_string;

      sensitiveParams.forEach(param => {
        const regex = new RegExp(`${param}=[^&]*`, 'gi');
        queryString = queryString.replace(regex, `${param}=[REDACTED]`);
      });

      event.request.query_string = queryString;
    }

    // Scrub potential PII from extra data
    if (event.extra) {
      // Remove any fields that might contain PII
      const piiFields = ['email', 'phone', 'name', 'address', 'dob', 'ssn'];

      Object.keys(event.extra).forEach(key => {
        if (piiFields.some(field => key.toLowerCase().includes(field))) {
          event.extra![key] = '[REDACTED_PII]';
        }
      });
    }

    return event;
  },

  // Add context for server-side errors
  beforeSendTransaction(event) {
    // Add server-specific context
    event.contexts = {
      ...event.contexts,
      runtime: {
        name: 'node',
        version: process.version,
      },
    };
    return event;
  },
});
