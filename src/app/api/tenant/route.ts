import { NextResponse } from 'next/server';
import { getTenantData } from '@/lib/tenant-context';

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
    console.error('Error fetching tenant data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}
