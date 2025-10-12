import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/logger';

/**
 * Request logging middleware
 * Logs all HTTP requests with timing information
 *
 * Useful for:
 * - Performance monitoring
 * - Debugging production issues
 * - API usage analytics
 * - Error tracking
 */
export async function loggingMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const start = Date.now();
  const { pathname, search } = request.nextUrl;
  const fullPath = `${pathname}${search}`;

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: request.method,
    path: fullPath,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  try {
    // Process request
    const response = await next();
    const duration = Date.now() - start;

    // Log completed request
    logger.http(
      request.method,
      fullPath,
      response.status,
      duration,
      {
        requestId,
      }
    );

    // Add request ID to response headers for tracing
    response.headers.set('X-Request-ID', requestId);

    return response;
  } catch (error) {
    const duration = Date.now() - start;

    // Log error
    logger.error('Request failed', {
      requestId,
      method: request.method,
      path: fullPath,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    throw error;
  }
}
