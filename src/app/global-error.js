'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <h1 className="mb-4 text-6xl font-bold">500</h1>
            <h2 className="mb-4 text-2xl">Something went wrong!</h2>
            <p className="mb-8 text-gray-400">
              An unexpected error occurred. Our team has been notified.
            </p>
            <button
              onClick={reset}
              className="rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}