import { updateSession } from './src/lib/supabase-middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from './src/lib/logger';

// TEST tenant ID for tester.compsync.net
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';

export async function middleware(request: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  const { pathname, search } = request.nextUrl;
  const fullPath = `${pathname}${search}`;
  const hostname = request.headers.get('host') || '';

  try {
    // Log incoming request (only in development or for errors)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Request', {
        requestId,
        method: request.method,
        path: fullPath,
        hostname,
      });
    }

    // 🚨 TENANT RESTRICTION: tester.compsync.net = TEST tenant ONLY
    if (hostname.includes('tester.compsync.net')) {
      // Add TEST tenant ID to request headers for downstream use
      const response = await updateSession(request);
      response.headers.set('X-Tenant-Restriction', TEST_TENANT_ID);
      response.headers.set('X-Environment', 'testing');
      response.headers.set('X-Request-ID', requestId);

      const duration = Date.now() - start;

      // Log slow requests (>1s)
      if (duration > 1000) {
        logger.warn('Slow request detected (TEST tenant)', {
          requestId,
          method: request.method,
          path: fullPath,
          duration,
          tenantId: TEST_TENANT_ID,
        });
      }

      return response;
    }

    // Process normal Supabase session update for production domains
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
