import { updateSession } from './src/lib/supabase-middleware';
import { type NextRequest } from 'next/server';
import { logger, generateRequestId } from './src/lib/logger';

export async function middleware(request: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  const { pathname, search } = request.nextUrl;
  const fullPath = `${pathname}${search}`;

  try {
    // Log incoming request (only in development or for errors)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Request', {
        requestId,
        method: request.method,
        path: fullPath,
      });
    }

    // Process Supabase session update
    const response = await updateSession(request);
    const duration = Date.now() - start;

    // Add request ID for tracing
    response.headers.set('X-Request-ID', requestId);

    // Log slow requests (>1s)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: request.method,
        path: fullPath,
        duration,
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - start;

    // Log error
    logger.error('Middleware error', {
      requestId,
      method: request.method,
      path: fullPath,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    throw error;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
