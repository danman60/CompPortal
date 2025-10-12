/**
 * Live Competition Router
 * Task #26: Backend integration for At Competition Mode
 *
 * Provides tRPC endpoints for:
 * - Loading competition lineup (routines with order)
 * - Fetching judge assignments
 * - Persisting score submissions
 * - Recording routine state changes (current, completed, skipped)
 * - Competition session management
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const liveCompetitionRouter = router({
  /**
   * Get competition lineup with all routines
   */
  getLineup: publicProcedure
    .input(z.object({
      competitionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const competition = await prisma.competitions.findUnique({
        where: {
          id: input.competitionId,
          tenant_id: ctx.tenantId,
        },
        include: {
          competition_entries: {
            where: {
              status: 'registered', // Schema uses 'registered' as default status
            },
            include: {
              studios: true,
              dance_categories: true, // Include category details
              entry_participants: {
                include: {
                  dancers: true,
                },
              },
            },
            orderBy: {
              running_order: 'asc', // Use running_order field for lineup order
            },
          },
        },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Transform competition_entries to routine format
      const routines = competition.competition_entries.map((entry, index) => ({
        id: entry.id,
        routineId: entry.id,
        title: entry.title, // Correct field name from schema
        studioName: entry.studios?.name || 'Unknown Studio',
        category: entry.dance_categories?.name || 'Uncategorized', // Use relation
        dancers: entry.entry_participants.map(p =>
          `${p.dancers?.first_name || ''} ${p.dancers?.last_name || ''}`.trim()
        ).filter(Boolean),
        duration: entry.duration_seconds || 180, // Duration in seconds from database
        order: entry.running_order || index + 1, // Use running_order from schema
        liveStatus: entry.live_status || 'queued', // Track routine state during live competition
      }));

      return {
        competitionId: competition.id,
        competitionName: competition.name, // Schema uses 'name', not 'competition_name'
        startDate: competition.competition_start_date,
        endDate: competition.competition_end_date,
        routines,
      };
    }),

  /**
   * Get assigned judges for a competition
   */
  getJudges: publicProcedure
    .input(z.object({
      competitionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // For now, return judges who have the 'judge' role in the tenant
      // TODO: Add proper judge assignment table/relationship
      const judges = await prisma.user_profiles.findMany({
        where: {
          tenant_id: ctx.tenantId,
          role: 'super_admin', // TODO: Add 'judge' role to enum
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      });

      return judges.map(judge => ({
        judgeId: judge.id,
        judgeName: `${judge.first_name || ''} ${judge.last_name || ''}`.trim() || 'Judge',
        ready: false, // Will be tracked via WebSocket
        connected: false, // Will be tracked via WebSocket
        scoresSubmitted: 0, // Will be counted from scores table
      }));
    }),

  /**
   * Update routine status (current, completed, skipped)
   */
  updateRoutineStatus: publicProcedure
    .input(z.object({
      routineId: z.string(),
      status: z.enum(['queued', 'current', 'completed', 'skipped']),
      timestamp: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Verify routine belongs to this tenant
      const entry = await prisma.competition_entries.findFirst({
        where: {
          id: input.routineId,
          tenant_id: ctx.tenantId,
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Routine not found',
        });
      }

      // Update live status
      await prisma.competition_entries.update({
        where: { id: input.routineId },
        data: {
          live_status: input.status,
        },
      });

      return {
        success: true,
        routineId: input.routineId,
        status: input.status,
      };
    }),

  /**
   * Submit a score for a routine
   */
  submitScore: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      routineId: z.string(),
      judgeId: z.string(),
      score: z.number().min(0).max(10),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Verify routine exists and belongs to competition
      const entry = await prisma.competition_entries.findFirst({
        where: {
          id: input.routineId,
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Routine not found in competition',
        });
      }

      // Create score record in scores table
      // Note: Schema has technical/artistic/performance/overall/total scores
      // For simple scoring, we use total_score. Unique constraint on [entry_id, judge_id]
      await prisma.scores.upsert({
        where: {
          entry_id_judge_id: {
            entry_id: input.routineId,
            judge_id: input.judgeId,
          },
        },
        create: {
          entry_id: input.routineId,
          judge_id: input.judgeId,
          total_score: input.score,
          comments: input.notes,
          scored_at: new Date(),
        },
        update: {
          total_score: input.score,
          comments: input.notes,
          modified_at: new Date(),
        },
      });

      return {
        success: true,
        routineId: input.routineId,
        judgeId: input.judgeId,
        score: input.score,
      };
    }),

  /**
   * Get scores for a routine
   */
  getRoutineScores: publicProcedure
    .input(z.object({
      routineId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const entry = await prisma.competition_entries.findFirst({
        where: {
          id: input.routineId,
          tenant_id: ctx.tenantId,
        },
        select: {
          id: true,
          title: true,
          scores: {
            include: {
              judges: {
                select: {
                  id: true,
                  name: true, // Schema has single 'name' field, not first_name/last_name
                },
              },
            },
          },
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Routine not found',
        });
      }

      const scores = entry.scores.map(s => ({
        judgeId: s.judge_id,
        judgeName: s.judges.name || 'Judge', // Schema has single name field
        score: Number(s.total_score),
        comments: s.comments,
        timestamp: s.scored_at,
      }));

      const averageScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length
        : null;

      return {
        routineId: entry.id,
        routineTitle: entry.title,
        scores,
        averageScore,
        scoresCount: scores.length,
      };
    }),

  /**
   * Get competition standings (leaderboard)
   */
  getStandings: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      category: z.string().optional(), // Filter by dance category
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          status: 'registered', // Schema uses 'registered'
          live_status: 'completed', // Only show completed routines in standings
          ...(input.category ? {
            dance_categories: {
              name: input.category,
            },
          } : {}),
        },
        include: {
          studios: true,
          dance_categories: true,
          scores: true,
        },
      });

      // Use calculated scores for rankings
      const standings = entries
        .map(entry => ({
          routineId: entry.id,
          routineTitle: entry.title,
          studioName: entry.studios?.name || 'Unknown',
          category: entry.dance_categories?.name || 'Uncategorized',
          averageScore: Number(entry.calculated_score) || 0,
          awardLevel: entry.award_level || 'pending',
          scoresCount: entry.scores.length,
        }))
        .filter(s => s.averageScore > 0) // Only entries with calculated scores
        .sort((a, b) => b.averageScore - a.averageScore) // Highest first
        .map((standing, index) => ({
          ...standing,
          rank: index + 1,
        }));

      return {
        competitionId: input.competitionId,
        category: input.category || 'All Categories',
        standings,
        totalEntries: standings.length,
      };
    }),

  /**
   * Calculate score and award level for a routine
   */
  calculateScore: publicProcedure
    .input(z.object({
      routineId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Get entry with scores and competition
      const entry = await prisma.competition_entries.findFirst({
        where: {
          id: input.routineId,
          tenant_id: ctx.tenantId,
        },
        include: {
          scores: true,
          competitions: {
            select: {
              id: true,
              scoring_ranges: true,
            },
          },
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Routine not found',
        });
      }

      // Calculate average score
      const scores = entry.scores;
      if (scores.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No scores submitted for this routine',
        });
      }

      const total = scores.reduce((sum, s) => sum + Number(s.total_score), 0);
      const average = total / scores.length;

      // Get scoring ranges from competition
      const scoringRanges = entry.competitions.scoring_ranges as {
        platinum?: [number, number];
        high_gold?: [number, number];
        gold?: [number, number];
        silver?: [number, number];
        bronze?: [number, number];
      } || {
        platinum: [95, 100],
        high_gold: [90, 94.9],
        gold: [85, 89.9],
        silver: [80, 84.9],
        bronze: [70, 79.9],
      };

      // Determine award level
      let awardLevel = 'participation';
      if (average >= scoringRanges.platinum![0] && average <= scoringRanges.platinum![1]) {
        awardLevel = 'platinum';
      } else if (average >= scoringRanges.high_gold![0] && average <= scoringRanges.high_gold![1]) {
        awardLevel = 'high_gold';
      } else if (average >= scoringRanges.gold![0] && average <= scoringRanges.gold![1]) {
        awardLevel = 'gold';
      } else if (average >= scoringRanges.silver![0] && average <= scoringRanges.silver![1]) {
        awardLevel = 'silver';
      } else if (average >= scoringRanges.bronze![0] && average <= scoringRanges.bronze![1]) {
        awardLevel = 'bronze';
      }

      // Update entry with calculated score and award level
      await prisma.competition_entries.update({
        where: { id: input.routineId },
        data: {
          calculated_score: average,
          award_level: awardLevel,
        },
      });

      return {
        success: true,
        routineId: input.routineId,
        calculatedScore: average,
        awardLevel,
        scoresCount: scores.length,
      };
    }),

  /**
   * Get competition statistics
   */
  getStats: publicProcedure
    .input(z.object({
      competitionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const competition = await prisma.competitions.findUnique({
        where: {
          id: input.competitionId,
          tenant_id: ctx.tenantId,
        },
        include: {
          competition_entries: {
            where: {
              status: 'registered',
            },
            include: {
              scores: true,
            },
          },
        },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      const entries = competition.competition_entries;
      const completedCount = entries.filter(e => e.live_status === 'completed').length;
      const currentEntry = entries.find(e => e.live_status === 'current');
      const queuedCount = entries.filter(e => e.live_status === 'queued').length;

      // Calculate total scores submitted
      const totalScores = entries.reduce((sum, entry) => {
        return sum + entry.scores.length;
      }, 0);

      return {
        competitionId: competition.id,
        competitionName: competition.name, // Schema uses 'name'
        totalRoutines: entries.length,
        completed: completedCount,
        current: currentEntry ? 1 : 0,
        queued: queuedCount,
        totalScoresSubmitted: totalScores,
        progress: entries.length > 0 ? (completedCount / entries.length) * 100 : 0,
      };
    }),

  /**
   * Start competition (marks competition as live)
   */
  startCompetition: publicProcedure
    .input(z.object({
      competitionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const competition = await prisma.competitions.findUnique({
        where: {
          id: input.competitionId,
          tenant_id: ctx.tenantId,
        },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Update competition status
      await prisma.competitions.update({
        where: { id: input.competitionId },
        data: {
          status: 'active', // active | pending | completed
        },
      });

      return {
        success: true,
        competitionId: input.competitionId,
        status: 'active',
      };
    }),

  /**
   * End competition (marks competition as completed)
   */
  endCompetition: publicProcedure
    .input(z.object({
      competitionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const competition = await prisma.competitions.findUnique({
        where: {
          id: input.competitionId,
          tenant_id: ctx.tenantId,
        },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Update competition status
      await prisma.competitions.update({
        where: { id: input.competitionId },
        data: {
          status: 'completed',
        },
      });

      return {
        success: true,
        competitionId: input.competitionId,
        status: 'completed',
      };
    }),
});
