import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tenants
 * Returns list of all available tenants for selection page
 * This is a public endpoint (no auth required)
 */
export async function GET() {
  try {
    const tenants = await prisma.tenants.findMany({
      select: {
        id: true,
        slug: true,
        subdomain: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      tenants,
      success: true,
    });
  } catch (error) {
    console.error('Failed to fetch tenants:', error);
    return NextResponse.json(
      {
        tenants: [],
        success: false,
        error: 'Failed to load competitions',
      },
      { status: 500 }
    );
  }
}
