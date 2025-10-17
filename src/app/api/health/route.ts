import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

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
 *
 * Wave 6: Production Monitoring
 */
export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      email: 'unknown',
      application: 'healthy',
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  // Check database connectivity
  try {
    // Uses $queryRaw to avoid model dependencies
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = 'healthy';
  } catch (error) {
    console.error('Health check database error:', error);
    checks.status = 'unhealthy';
    checks.checks.database = 'unhealthy';
  }

  // Check email service (SMTP)
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    if (!host || !user || !pass) {
      // Email not configured (non-critical for health check)
      checks.checks.email = 'not_configured';
    } else {
      // Verify SMTP connection
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      await transporter.verify();
      checks.checks.email = 'healthy';
    }
  } catch (error) {
    console.error('Health check email error:', error);
    // Email failures are logged but don't mark system as unhealthy
    // since email is non-critical for core app functionality
    checks.checks.email = 'degraded';
  }

  // Return 503 only if critical services are down (database)
  if (checks.status === 'unhealthy') {
    return NextResponse.json(checks, { status: 503 });
  }

  // All checks passed (or email is degraded/not_configured, which is acceptable)
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
    // Only check database for HEAD (critical service)
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Health check database error:', error);
    return new NextResponse(null, { status: 503 });
  }
}
