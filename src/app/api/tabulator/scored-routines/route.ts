import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface JudgeScoreRow {
  entry_id: string;
  entry_number: string;
  routine_name: string;
  studio_name: string;
  category: string;
  age_group: string;
  judge_name: string | null;
  judge_number: number | null;
  score: number;
  scored_at: Date | null;
}

// Public API for tabulator - no authentication required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');

    // If no competition ID, get the most recent active competition
    let targetCompetitionId = competitionId;

    if (!targetCompetitionId) {
      // Find the most recent competition with live state
      const activeCompetition = await prisma.$queryRaw<Array<{ competition_id: string }>>`
        SELECT competition_id FROM live_competition_state
        WHERE is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      if (activeCompetition.length > 0) {
        targetCompetitionId = activeCompetition[0].competition_id;
      } else {
        // Fall back to most recent competition with scores
        const recentComp = await prisma.$queryRaw<Array<{ competition_id: string }>>`
          SELECT DISTINCT e.competition_id
          FROM competition_entries e
          JOIN scores s ON e.id = s.entry_id
          WHERE s.total_score IS NOT NULL
          ORDER BY e.created_at DESC
          LIMIT 1
        `;
        if (recentComp.length > 0) {
          targetCompetitionId = recentComp[0].competition_id;
        }
      }
    }

    if (!targetCompetitionId) {
      return NextResponse.json({ routines: [] });
    }

    // Get all scored entries with individual judge scores
    const rawScores = await prisma.$queryRaw<JudgeScoreRow[]>`
      SELECT
        e.id as entry_id,
        e.entry_number::text as entry_number,
        e.title as routine_name,
        st.name as studio_name,
        COALESCE(c.name, 'Unknown') as category,
        COALESCE(ag.name, 'Unknown') as age_group,
        COALESCE(u.name, CONCAT('Judge ', j.judge_number::text)) as judge_name,
        j.judge_number,
        s.total_score as score,
        s.scored_at
      FROM competition_entries e
      JOIN studios st ON e.studio_id = st.id
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN age_groups ag ON e.age_group_id = ag.id
      JOIN scores s ON e.id = s.entry_id
      JOIN judges j ON s.judge_id = j.id
      LEFT JOIN users u ON j.user_id = u.id
      WHERE e.competition_id = ${targetCompetitionId}::uuid
        AND s.total_score IS NOT NULL
      ORDER BY e.entry_number, j.judge_number
    `;

    // Group scores by entry
    const entriesMap = new Map<string, {
      id: string;
      entryNumber: number;
      routineName: string;
      studioName: string;
      category: string;
      ageGroup: string;
      judges: Array<{
        judgeName: string;
        judgeNumber: number | null;
        score: number;
      }>;
      scoredAt: string;
    }>();

    for (const row of rawScores) {
      const entryId = row.entry_id;

      if (!entriesMap.has(entryId)) {
        entriesMap.set(entryId, {
          id: entryId,
          entryNumber: parseInt(row.entry_number) || 0,
          routineName: row.routine_name || '',
          studioName: row.studio_name || '',
          category: row.category || '',
          ageGroup: row.age_group || '',
          judges: [],
          scoredAt: row.scored_at?.toISOString() || new Date().toISOString(),
        });
      }

      const entry = entriesMap.get(entryId)!;
      entry.judges.push({
        judgeName: row.judge_name || `Judge ${row.judge_number || 'Unknown'}`,
        judgeNumber: row.judge_number,
        score: Number(row.score),
      });

      // Update scored_at if this score is more recent
      if (row.scored_at) {
        const currentScoredAt = new Date(entry.scoredAt);
        if (row.scored_at > currentScoredAt) {
          entry.scoredAt = row.scored_at.toISOString();
        }
      }
    }

    // Calculate averages and award levels
    const routines = Array.from(entriesMap.values())
      .filter(entry => entry.judges.length >= 1) // At least 1 judge score
      .map(entry => {
        const totalScore = entry.judges.reduce((sum, j) => sum + j.score, 0);
        const averageScore = totalScore / entry.judges.length;

        // Determine award level based on average score
        let awardLevel = 'Bronze';
        if (averageScore >= 95) awardLevel = 'Platinum';
        else if (averageScore >= 90) awardLevel = 'High Gold';
        else if (averageScore >= 85) awardLevel = 'Gold';
        else if (averageScore >= 80) awardLevel = 'High Silver';
        else if (averageScore >= 75) awardLevel = 'Silver';

        return {
          ...entry,
          averageScore,
          awardLevel,
        };
      })
      .sort((a, b) => a.entryNumber - b.entryNumber); // Sort by entry number

    return NextResponse.json({ routines });
  } catch (error) {
    console.error('Tabulator API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scored routines', routines: [] },
      { status: 500 }
    );
  }
}
