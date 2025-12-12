import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public API for backstage display - no authentication required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');

    // If no competition ID, get the most recent active competition
    let targetCompetitionId = competitionId;

    if (!targetCompetitionId) {
      const activeCompetition = await prisma.$queryRaw<Array<{ competition_id: string }>>`
        SELECT competition_id FROM live_competition_state
        WHERE is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      if (activeCompetition.length > 0) {
        targetCompetitionId = activeCompetition[0].competition_id;
      }
    }

    if (!targetCompetitionId) {
      return NextResponse.json({
        currentRoutine: null,
        nextRoutine: null,
        competitionName: null,
        isActive: false,
      });
    }

    // Get live competition state
    const liveState = await prisma.$queryRaw<Array<{
      current_entry_id: string | null;
      current_entry_state: string | null;
      current_entry_started_at: Date | null;
      is_active: boolean;
      competition_day: string | null;
    }>>`
      SELECT
        current_entry_id,
        current_entry_state,
        current_entry_started_at,
        is_active,
        competition_day
      FROM live_competition_state
      WHERE competition_id = ${targetCompetitionId}::uuid
      LIMIT 1
    `;

    if (!liveState.length || !liveState[0].is_active) {
      // Get competition name even if not active
      const comp = await prisma.competitions.findUnique({
        where: { id: targetCompetitionId },
        select: { name: true },
      });

      return NextResponse.json({
        currentRoutine: null,
        nextRoutine: null,
        competitionName: comp?.name || null,
        isActive: false,
      });
    }

    const state = liveState[0];
    const competitionDay = state.competition_day || new Date().toISOString().split('T')[0];

    // Get competition name
    const competition = await prisma.competitions.findUnique({
      where: { id: targetCompetitionId },
      select: { name: true },
    });

    // Get today's routines ordered by schedule_sequence
    const todayRoutines = await prisma.$queryRaw<Array<{
      id: string;
      entry_number: string;
      routine_name: string;
      studio_name: string;
      category: string;
      age_group: string;
      mp3_duration_ms: number | null;
      schedule_sequence: number | null;
    }>>`
      SELECT
        e.id,
        e.entry_number::text as entry_number,
        e.title as routine_name,
        s.name as studio_name,
        COALESCE(c.name, 'Unknown') as category,
        COALESCE(ag.name, 'Unknown') as age_group,
        e.mp3_duration_ms,
        e.schedule_sequence
      FROM competition_entries e
      JOIN studios s ON e.studio_id = s.id
      LEFT JOIN dance_categories c ON e.category_id = c.id
      LEFT JOIN age_groups ag ON e.age_group_id = ag.id
      WHERE e.competition_id = ${targetCompetitionId}::uuid
        AND e.scheduled_day = ${competitionDay}::date
        AND e.status != 'cancelled'
      ORDER BY e.schedule_sequence ASC NULLS LAST, e.entry_number ASC
    `;

    // Find current and upcoming routines
    let currentRoutine = null;
    let nextRoutine = null;
    const upcomingRoutines: Array<{
      id: string;
      entryNumber: string;
      routineName: string;
      studioName: string;
      category: string;
      ageGroup: string;
      durationMs: number;
      isBreak?: boolean;
    }> = [];

    if (state.current_entry_id) {
      const currentIndex = todayRoutines.findIndex(r => r.id === state.current_entry_id);

      if (currentIndex !== -1) {
        const current = todayRoutines[currentIndex];
        const durationMs = current.mp3_duration_ms || 180000; // Default 3 minutes

        currentRoutine = {
          id: current.id,
          entryNumber: current.entry_number,
          routineName: current.routine_name,
          studioName: current.studio_name,
          category: current.category,
          ageGroup: current.age_group,
          durationMs,
          startedAt: state.current_entry_started_at?.toISOString() || null,
          state: state.current_entry_state,
        };

        // Get next 4 routines for expanded upcoming list
        for (let i = currentIndex + 1; i < Math.min(currentIndex + 5, todayRoutines.length); i++) {
          const routine = todayRoutines[i];
          upcomingRoutines.push({
            id: routine.id,
            entryNumber: routine.entry_number,
            routineName: routine.routine_name,
            studioName: routine.studio_name,
            category: routine.category,
            ageGroup: routine.age_group,
            durationMs: routine.mp3_duration_ms || 180000,
          });
        }

        // Set first upcoming as nextRoutine for backwards compatibility
        if (upcomingRoutines.length > 0) {
          nextRoutine = upcomingRoutines[0];
        }
      }
    } else if (todayRoutines.length > 0) {
      // No current routine, show first few as upcoming
      for (let i = 0; i < Math.min(4, todayRoutines.length); i++) {
        const routine = todayRoutines[i];
        upcomingRoutines.push({
          id: routine.id,
          entryNumber: routine.entry_number,
          routineName: routine.routine_name,
          studioName: routine.studio_name,
          category: routine.category,
          ageGroup: routine.age_group,
          durationMs: routine.mp3_duration_ms || 180000,
        });
      }
      if (upcomingRoutines.length > 0) {
        nextRoutine = upcomingRoutines[0];
      }
    }

    return NextResponse.json({
      currentRoutine,
      nextRoutine,
      upcomingRoutines,
      competitionId: targetCompetitionId,
      competitionName: competition?.name || null,
      competitionDay,
      isActive: true,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Backstage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backstage data' },
      { status: 500 }
    );
  }
}
