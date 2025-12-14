import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * TEST ENDPOINT - Get award levels for a competition
 * Fetches adjudication_levels from competition_settings based on the competition's tenant
 */

interface AwardLevel {
  name: string;
  min: number;
  max: number;
  color: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');

    if (!competitionId) {
      return NextResponse.json(
        { error: 'Missing competitionId' },
        { status: 400 }
      );
    }

    // Get the competition's tenant_id first
    const competition = await prisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT tenant_id FROM competitions WHERE id = ${competitionId}::uuid
    `;

    if (!competition || competition.length === 0) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    const tenantId = competition[0].tenant_id;

    // Get award levels from competition_settings for this tenant
    // Use the first one we find (they're typically the same across age divisions)
    const settings = await prisma.$queryRaw<Array<{
      adjudication_levels: { levels: AwardLevel[]; edgeCaseThreshold?: number } | null;
    }>>`
      SELECT adjudication_levels
      FROM competition_settings
      WHERE adjudication_levels IS NOT NULL
      LIMIT 1
    `;

    if (!settings || settings.length === 0 || !settings[0].adjudication_levels) {
      // Return default levels if none found
      return NextResponse.json({
        levels: [
          { name: 'Dynamic Diamond', min: 95.0, max: 99.99, color: '#00D4FF' },
          { name: 'Titanium', min: 92.0, max: 94.99, color: '#C0C0C0' },
          { name: 'Platinum', min: 88.0, max: 91.99, color: '#E5E4E2' },
          { name: 'High Gold', min: 85.0, max: 87.99, color: '#FFD700' },
          { name: 'Gold', min: 80.0, max: 84.99, color: '#DAA520' },
          { name: 'Silver', min: 75.0, max: 79.99, color: '#C0C0C0' },
          { name: 'Bronze', min: 0, max: 74.99, color: '#CD7F32' },
        ],
        source: 'default',
      });
    }

    return NextResponse.json({
      levels: settings[0].adjudication_levels.levels,
      source: 'database',
    });

  } catch (error) {
    console.error('Test get-award-levels error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch award levels', details: String(error) },
      { status: 500 }
    );
  }
}
