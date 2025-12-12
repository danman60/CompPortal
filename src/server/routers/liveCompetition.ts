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
        duration: 180, // Default 3 minutes (duration_seconds field removed)
        order: entry.running_order || index + 1, // Use running_order from schema
        liveStatus: 'queued', // Default status (live_status field removed)
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

      // Get judges assigned to this competition from judges table
      const judges = await prisma.judges.findMany({
        where: {
          competition_id: input.competitionId,
        },
        select: {
          id: true,
          name: true,
          judge_number: true,
          panel_assignment: true,
          confirmed: true,
          checked_in: true,
          _count: {
            select: {
              scores: true, // Count scores submitted by this judge
            },
          },
        },
      });

      return judges.map(judge => ({
        judgeId: judge.id,
        judgeName: judge.name || 'Judge',
        judgeNumber: judge.judge_number,
        panelAssignment: judge.panel_assignment,
        confirmed: judge.confirmed || false,
        ready: judge.checked_in || false, // Use checked_in status for ready state
        connected: false, // Will be tracked via WebSocket
        scoresSubmitted: judge._count.scores,
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

      // Note: live_status field removed from schema
      // This mutation is deprecated but kept for API compatibility
      // TODO: Remove or implement with separate live_competition_state table

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
      score: z.number().min(0).max(99.99),
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
          tenant_id: entry.tenant_id,
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
          // live_status field removed - show all entries with calculated scores
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
      // Note: live_status field removed - stats based on scores instead
      const completedCount = entries.filter(e => e.calculated_score && Number(e.calculated_score) > 0).length;
      const queuedCount = entries.filter(e => !e.calculated_score || Number(e.calculated_score) === 0).length;

      // Calculate total scores submitted
      const totalScores = entries.reduce((sum, entry) => {
        return sum + entry.scores.length;
      }, 0);

      return {
        competitionId: competition.id,
        competitionName: competition.name, // Schema uses 'name'
        totalRoutines: entries.length,
        completed: completedCount, // Entries with calculated scores
        current: 0, // Not tracked without live_status
        queued: queuedCount, // Entries without calculated scores
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

  /**
   * Request a break (from Judge)
   */
  requestBreak: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      judgeId: z.string(),
      requestedDurationMinutes: z.number().min(5).max(60),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Verify judge belongs to competition
      const judge = await prisma.judges.findFirst({
        where: {
          id: input.judgeId,
          competition_id: input.competitionId,
        },
      });

      if (!judge) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Judge not found in competition',
        });
      }

      // Create break request
      const breakRequest = await prisma.break_requests.create({
        data: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
          judge_id: input.judgeId,
          requested_duration_minutes: input.requestedDurationMinutes,
          request_reason: input.reason,
          status: 'pending',
        },
      });

      return {
        success: true,
        requestId: breakRequest.id,
        status: 'pending',
      };
    }),

  /**
   * Get pending break requests (for CD)
   */
  getBreakRequests: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      status: z.enum(['pending', 'approved', 'denied', 'completed']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const breakRequests = await prisma.break_requests.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          judges: {
            select: {
              id: true,
              name: true,
              judge_number: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return breakRequests.map(req => ({
        id: req.id,
        judgeId: req.judge_id,
        judgeName: req.judges?.name || 'Unknown Judge',
        judgeNumber: req.judges?.judge_number,
        requestedDurationMinutes: req.requested_duration_minutes,
        reason: req.request_reason,
        status: req.status,
        createdAt: req.created_at,
        respondedAt: req.responded_at,
        denyReason: req.deny_reason,
      }));
    }),

  /**
   * Approve a break request (CD action)
   */
  approveBreak: publicProcedure
    .input(z.object({
      requestId: z.string(),
      actualDurationMinutes: z.number().min(5).max(60).optional(),
      insertAfterRoutineId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Get break request
      const breakRequest = await prisma.break_requests.findFirst({
        where: {
          id: input.requestId,
          tenant_id: ctx.tenantId,
          status: 'pending',
        },
      });

      if (!breakRequest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Break request not found or already processed',
        });
      }

      // Update break request status
      await prisma.break_requests.update({
        where: { id: input.requestId },
        data: {
          status: 'approved',
          responded_at: new Date(),
        },
      });

      // Create scheduled break entry
      const scheduledBreak = await prisma.schedule_breaks.create({
        data: {
          tenant_id: ctx.tenantId,
          competition_id: breakRequest.competition_id,
          break_request_id: breakRequest.id,
          duration_minutes: input.actualDurationMinutes || breakRequest.requested_duration_minutes,
          insert_after_entry_id: input.insertAfterRoutineId,
          status: 'scheduled',
        },
      });

      return {
        success: true,
        requestId: input.requestId,
        breakId: scheduledBreak.id,
        durationMinutes: scheduledBreak.duration_minutes,
      };
    }),

  /**
   * Deny a break request (CD action)
   */
  denyBreak: publicProcedure
    .input(z.object({
      requestId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Get break request
      const breakRequest = await prisma.break_requests.findFirst({
        where: {
          id: input.requestId,
          tenant_id: ctx.tenantId,
          status: 'pending',
        },
      });

      if (!breakRequest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Break request not found or already processed',
        });
      }

      // Update break request status
      await prisma.break_requests.update({
        where: { id: input.requestId },
        data: {
          status: 'denied',
          deny_reason: input.reason,
          responded_at: new Date(),
        },
      });

      return {
        success: true,
        requestId: input.requestId,
        status: 'denied',
      };
    }),

  /**
   * Get scheduled breaks for a competition
   */
  getScheduledBreaks: publicProcedure
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

      const breaks = await prisma.schedule_breaks.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
        },
        include: {
          break_requests: {
            include: {
              judges: {
                select: {
                  name: true,
                  judge_number: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      return breaks.map(b => ({
        id: b.id,
        durationMinutes: b.duration_minutes,
        insertAfterEntryId: b.insert_after_entry_id,
        status: b.status,
        requestedBy: b.break_requests?.judges?.name || 'CD Added',
        judgeNumber: b.break_requests?.judges?.judge_number,
        createdAt: b.created_at,
        startedAt: b.actual_start_time,
        endedAt: b.actual_end_time,
      }));
    }),

  /**
   * Start a scheduled break
   */
  startBreak: publicProcedure
    .input(z.object({
      breakId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      await prisma.schedule_breaks.update({
        where: {
          id: input.breakId,
          tenant_id: ctx.tenantId,
        },
        data: {
          status: 'in_progress',
          actual_start_time: new Date(),
        },
      });

      return { success: true, breakId: input.breakId };
    }),

  /**
   * End a scheduled break
   */
  endBreak: publicProcedure
    .input(z.object({
      breakId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      await prisma.schedule_breaks.update({
        where: {
          id: input.breakId,
          tenant_id: ctx.tenantId,
        },
        data: {
          status: 'completed',
          actual_end_time: new Date(),
        },
      });

      // Also mark break request as completed
      const scheduleBreak = await prisma.schedule_breaks.findUnique({
        where: { id: input.breakId },
        select: { break_request_id: true },
      });

      if (scheduleBreak?.break_request_id) {
        await prisma.break_requests.update({
          where: { id: scheduleBreak.break_request_id },
          data: { status: 'completed' },
        });
      }

      return { success: true, breakId: input.breakId };
    }),

  /**
   * Add a break directly (CD can add without request)
   */
  addBreak: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      durationMinutes: z.number().min(5).max(60),
      insertAfterRoutineId: z.string().optional(),
      label: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const scheduledBreak = await prisma.schedule_breaks.create({
        data: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
          duration_minutes: input.durationMinutes,
          insert_after_entry_id: input.insertAfterRoutineId,
          title: input.label,
          status: 'scheduled',
        },
      });

      return {
        success: true,
        breakId: scheduledBreak.id,
        durationMinutes: scheduledBreak.duration_minutes,
      };
    }),
});
