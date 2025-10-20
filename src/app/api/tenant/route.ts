import { NextResponse } from 'next/server';
import { getTenantData } from '@/lib/tenant-context';
import { logger } from '@/lib/logger';

/**
 * GET /api/tenant
 *
 * Returns current tenant data for client-side consumption
 */
export async function GET() {
  try {
    const tenantData = await getTenantData();

    if (!tenantData) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tenantData);
  } catch (error) {
    logger.error('Error fetching tenant data', { error: error instanceof Error ? error : new Error(String(error)) });
    return NextResponse.json(
      { error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}
