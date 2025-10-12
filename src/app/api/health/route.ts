import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Health check endpoint for monitoring and load balancers
 * Returns 200 OK if the application is healthy
 * Returns 503 Service Unavailable if critical services are down
 *
 * Used by:
 * - Load balancers for routing decisions
 * - Monitoring systems (Datadog, New Relic, etc.)
 * - Uptime monitoring services
 * - Container orchestration health probes
 */
export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      application: 'healthy',
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    // Check database connectivity with a simple query
    // Uses $queryRaw to avoid model dependencies
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = 'healthy';
  } catch (error) {
    console.error('Health check database error:', error);
    checks.status = 'unhealthy';
    checks.checks.database = 'unhealthy';

    // Return 503 Service Unavailable for unhealthy state
    return NextResponse.json(checks, { status: 503 });
  }

  // All checks passed
  return NextResponse.json(checks, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * HEAD request support for efficient health checks
 * Some load balancers prefer HEAD requests to reduce bandwidth
 */
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Health check database error:', error);
    return new NextResponse(null, { status: 503 });
  }
}
