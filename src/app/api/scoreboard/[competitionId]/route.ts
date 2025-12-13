import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public API - no authentication required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ competitionId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const { competitionId } = await params;

    // Get competition info
    const competition = await prisma.competitions.findUnique({
      where: { id: competitionId },
      select: {
        id: true,
        name: true,
        tenant_id: true,
      },
    });

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Check for operating_date from live_competition_state
    let targetDay: string | null = null;
    const liveState = await prisma.$queryRaw<Array<{ operating_date: Date | null }>>`
      SELECT operating_date FROM live_competition_state
      WHERE competition_id = ${competitionId}::uuid
      LIMIT 1
    `;
    if (liveState.length > 0 && liveState[0].operating_date) {
      targetDay = new Date(liveState[0].operating_date).toISOString().split('T')[0];
    }

    // Get scored entries with their average scores using raw SQL
    // Since scores table may not be in Prisma schema, use raw query
    const baseQuery = `
      SELECT
        e.id,
        e.entry_number,
        e.routine_name,
        s.name as studio_name,
        e.category,
        e.age_group,
        e.entry_type,
        AVG(sc.score) as average_score,
        MAX(sc.created_at) as scored_at
      FROM competition_entries e
      JOIN studios s ON e.studio_id = s.id
      JOIN scores sc ON e.id = sc.entry_id
      WHERE e.competition_id = $1
        AND sc.score IS NOT NULL
        ${targetDay ? `AND e.performance_date = '${targetDay}'::date` : ''}
        ${category !== 'all' ? 'AND e.category = $2' : ''}
      GROUP BY e.id, e.entry_number, e.routine_name, s.name, e.category, e.age_group, e.entry_type
      HAVING COUNT(sc.id) >= 3
      ORDER BY average_score DESC
    `;

    const queryParams = category !== 'all'
      ? [competitionId, category]
      : [competitionId];

    const scoredEntries = await prisma.$queryRawUnsafe<Array<{
      id: string;
      entry_number: string;
      routine_name: string;
      studio_name: string;
      category: string;
      age_group: string;
      entry_type: string;
      average_score: number;
      scored_at: Date;
    }>>(baseQuery, ...queryParams);

    // Calculate award levels and placements
    const standings = scoredEntries.map((entry, index) => {
      const score = Number(entry.average_score);
      let awardLevel = 'Bronze';

      if (score >= 95) awardLevel = 'Platinum';
      else if (score >= 90) awardLevel = 'High Gold';
      else if (score >= 85) awardLevel = 'Gold';
      else if (score >= 80) awardLevel = 'High Silver';
      else if (score >= 75) awardLevel = 'Silver';

      return {
        id: entry.id,
        entryNumber: entry.entry_number,
        routineName: entry.routine_name,
        studioName: entry.studio_name,
        category: entry.category,
        ageGroup: entry.age_group,
        entryType: entry.entry_type,
        averageScore: score,
        awardLevel,
        placement: index + 1,
        scoredAt: entry.scored_at?.toISOString() || new Date().toISOString(),
      };
    });

    // Get unique categories for filter dropdown using raw SQL
    const categoriesResult = await prisma.$queryRaw<Array<{ category: string }>>`
      SELECT DISTINCT category FROM competition_entries
      WHERE competition_id = ${competitionId}
      AND category IS NOT NULL
      ORDER BY category
    `;
    const categories = categoriesResult.map(c => c.category).filter(Boolean);

    // Get total entry count
    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM competition_entries
      WHERE competition_id = ${competitionId}
    `;
    const totalEntries = Number(countResult[0]?.count || 0);

    const completedEntries = standings.length;

    // Simple schedule status calculation
    const scheduleStatus = {
      totalRoutines: totalEntries,
      completedRoutines: completedEntries,
      currentRoutine: null,
      minutesAhead: 0, // Would need schedule data to calculate
    };

    return NextResponse.json({
      competitionName: competition.name,
      standings,
      categories,
      scheduleStatus,
    });
  } catch (error) {
    console.error('Scoreboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scoreboard data' },
      { status: 500 }
    );
  }
}
