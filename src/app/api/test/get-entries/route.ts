import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * TEST ENDPOINT - Get entries for a competition
 * Used by the automated test page to populate the entry dropdown
 */

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

    // Get entries for this competition
    const entries = await prisma.$queryRaw<Array<{
      id: string;
      entry_number: string;
      routine_name: string;
      studio_name: string;
    }>>`
      SELECT
        e.id,
        e.entry_number,
        e.routine_name,
        s.name as studio_name
      FROM competition_entries e
      JOIN studios s ON e.studio_id = s.id
      WHERE e.competition_id = ${competitionId}::uuid
        AND e.status != 'cancelled'
      ORDER BY e.entry_number::int ASC
      LIMIT 100
    `;

    return NextResponse.json({
      entries,
      count: entries.length,
    });

  } catch (error) {
    console.error('Test get-entries error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries', details: String(error) },
      { status: 500 }
    );
  }
}
