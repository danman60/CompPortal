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
   * Get active competitions for tabulator selection
   */
  getActiveCompetitions: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const competitions = await prisma.competitions.findMany({
        where: {
          tenant_id: ctx.tenantId,
          status: {
            in: ['scheduling', 'active', 'in_progress'],
          },
        },
        select: {
          id: true,
          name: true,
          competition_start_date: true,
          competition_end_date: true,
          status: true,
        },
        orderBy: {
          competition_start_date: 'desc',
        },
      });

      return competitions;
    }),

  /**
   * Get competition lineup with all routines
   */
  getLineup: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      performanceDate: z.string().optional(), // YYYY-MM-DD format to filter by day
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Build the where clause for entries
      const entriesWhere: Record<string, unknown> = {
        status: { not: 'cancelled' },
      };

      // Filter by performance_date if provided (date range for the day)
      if (input.performanceDate) {
        const targetDate = new Date(input.performanceDate + 'T00:00:00');
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        entriesWhere.performance_date = {
          gte: targetDate,
          lt: nextDay,
        };
      }

      const competition = await prisma.competitions.findUnique({
        where: {
          id: input.competitionId,
          tenant_id: ctx.tenantId,
        },
        include: {
          competition_entries: {
            where: entriesWhere,
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
              running_order: 'asc', // TODO: Change to schedule_sequence when Prisma schema updated
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
        scoreId: s.id, // Added for score editing (Task 13)
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
        platinum: [95, 99.99],
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
              status: { not: 'cancelled' }, // Include all valid entry statuses
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
   * Stop/Pause competition (sets live state to paused)
   */
  stopCompetition: publicProcedure
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

      // Update live state to paused
      await prisma.live_competition_state.update({
        where: {
          competition_id: input.competitionId,
        },
        data: {
          competition_state: 'paused',
          paused_at: new Date(),
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        competitionId: input.competitionId,
        status: 'paused',
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

  // =============================================
  // LIVE ROUTINE CONTROL (Task 19)
  // =============================================

  /**
   * Get live competition state
   */
  getLiveState: publicProcedure
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

      // Get or create live state
      let liveState = await prisma.live_competition_state.findUnique({
        where: {
          competition_id: input.competitionId,
        },
        include: {
          competition_entries: {
            select: {
              id: true,
              title: true,
              entry_number: true,
              running_order: true,
              studios: { select: { name: true } },
              dance_categories: { select: { name: true } },
            },
          },
          competitions: {
            select: {
              name: true,
              status: true,
            },
          },
        },
      });

      // If no state exists, return empty state
      if (!liveState) {
        return {
          competitionId: input.competitionId,
          competitionState: 'not_started',
          currentEntry: null,
          currentEntryState: null,
          playbackState: null,
          playbackPositionMs: 0,
          scheduleDelayMinutes: 0,
          judgesCanSeeScores: false,
          dayNumber: null,
          sessionNumber: null,
          operatingDate: null,
          liveModeStartedAt: null,
          pausedAt: null,
          lastSyncAt: null,
        };
      }

      return {
        competitionId: liveState.competition_id,
        competitionState: liveState.competition_state,
        currentEntry: liveState.competition_entries ? {
          id: liveState.competition_entries.id,
          title: liveState.competition_entries.title,
          entryNumber: liveState.competition_entries.entry_number,
          runningOrder: liveState.competition_entries.running_order,
          studioName: liveState.competition_entries.studios?.name,
          category: liveState.competition_entries.dance_categories?.name,
        } : null,
        currentEntryState: liveState.current_entry_state,
        currentEntryStartedAt: liveState.current_entry_started_at,
        playbackState: liveState.playback_state,
        playbackPositionMs: liveState.playback_position_ms || 0,
        playbackStartedAt: liveState.playback_started_at,
        scheduleDelayMinutes: liveState.schedule_delay_minutes || 0,
        originallyScheduledEndTime: liveState.originally_scheduled_end_time,
        projectedEndTime: liveState.projected_end_time,
        judgesCanSeeScores: liveState.judges_can_see_scores || false,
        dayNumber: liveState.day_number,
        sessionNumber: liveState.session_number,
        operatingDate: liveState.operating_date,
        liveModeStartedAt: liveState.live_mode_started_at,
        liveModeEndedAt: liveState.live_mode_ended_at,
        pausedAt: liveState.paused_at,
        lastSyncAt: liveState.last_sync_at,
      };
    }),

  /**
   * Initialize or update live state for a competition
   */
  initializeLiveState: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      dayNumber: z.number().optional(),
      sessionNumber: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Upsert live state
      const liveState = await prisma.live_competition_state.upsert({
        where: {
          competition_id: input.competitionId,
        },
        create: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
          competition_state: 'ready',
          day_number: input.dayNumber || 1,
          session_number: input.sessionNumber || 1,
        },
        update: {
          competition_state: 'ready',
          day_number: input.dayNumber,
          session_number: input.sessionNumber,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        stateId: liveState.id,
        competitionState: liveState.competition_state,
      };
    }),


  /**
   * Set operating date for Game Day views
   * All Game Day pages (Tabulator, Backstage, Scoreboard) will load
   * routines for this date instead of using the current date.
   */
  setOperatingDate: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      operatingDate: z.string().nullable(), // YYYY-MM-DD format or null to use current date
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Update live state with operating date
      const liveState = await prisma.live_competition_state.upsert({
        where: {
          competition_id: input.competitionId,
        },
        create: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
          competition_state: 'ready',
          operating_date: input.operatingDate ? new Date(input.operatingDate) : null,
        },
        update: {
          operating_date: input.operatingDate ? new Date(input.operatingDate) : null,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        operatingDate: liveState.operating_date,
      };
    }),

  /**
   * Set current routine (jump to specific routine)
   */
  setCurrentRoutine: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      routineId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Verify routine exists
      const entry = await prisma.competition_entries.findFirst({
        where: {
          id: input.routineId,
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
        },
        select: {
          id: true,
          title: true,
          entry_number: true,
          running_order: true,
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Routine not found',
        });
      }

      // Update live state
      const liveState = await prisma.live_competition_state.upsert({
        where: {
          competition_id: input.competitionId,
        },
        create: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
          competition_state: 'active',
          current_entry_id: input.routineId,
          current_entry_state: 'ready',
          current_entry_started_at: new Date(),
        },
        update: {
          current_entry_id: input.routineId,
          current_entry_state: 'ready',
          current_entry_started_at: new Date(),
          competition_state: 'active',
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        currentRoutineId: input.routineId,
        routineTitle: entry.title,
        entryNumber: entry.entry_number,
        runningOrder: entry.running_order,
      };
    }),

  /**
   * Advance to next routine
   */
  advanceRoutine: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      markPreviousComplete: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Get current live state
      const liveState = await prisma.live_competition_state.findUnique({
        where: {
          competition_id: input.competitionId,
        },
      });

      if (!liveState?.current_entry_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No current routine set',
        });
      }

      // Get current routine's running order
      const currentEntry = await prisma.competition_entries.findUnique({
        where: { id: liveState.current_entry_id },
        select: { running_order: true },
      });

      if (!currentEntry?.running_order) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Current routine has no running order',
        });
      }

      // Find next routine by running_order
      const nextEntry = await prisma.competition_entries.findFirst({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          running_order: { gt: currentEntry.running_order },
          status: 'registered',
        },
        orderBy: {
          running_order: 'asc',
        },
        select: {
          id: true,
          title: true,
          entry_number: true,
          running_order: true,
        },
      });

      if (!nextEntry) {
        // No more routines, mark competition as completing
        await prisma.live_competition_state.update({
          where: { competition_id: input.competitionId },
          data: {
            competition_state: 'completing',
            current_entry_state: 'completed',
            updated_at: new Date(),
          },
        });

        return {
          success: true,
          endOfLineup: true,
          message: 'No more routines in lineup',
        };
      }

      // Update live state to next routine
      await prisma.live_competition_state.update({
        where: { competition_id: input.competitionId },
        data: {
          current_entry_id: nextEntry.id,
          current_entry_state: 'ready',
          current_entry_started_at: new Date(),
          playback_state: null,
          playback_position_ms: 0,
          playback_started_at: null,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        endOfLineup: false,
        currentRoutineId: nextEntry.id,
        routineTitle: nextEntry.title,
        entryNumber: nextEntry.entry_number,
        runningOrder: nextEntry.running_order,
      };
    }),

  /**
   * Go to previous routine
   */
  previousRoutine: publicProcedure
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

      // Get current live state
      const liveState = await prisma.live_competition_state.findUnique({
        where: {
          competition_id: input.competitionId,
        },
      });

      if (!liveState?.current_entry_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No current routine set',
        });
      }

      // Get current routine's running order
      const currentEntry = await prisma.competition_entries.findUnique({
        where: { id: liveState.current_entry_id },
        select: { running_order: true },
      });

      if (!currentEntry?.running_order) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Current routine has no running order',
        });
      }

      // Find previous routine by running_order
      const prevEntry = await prisma.competition_entries.findFirst({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          running_order: { lt: currentEntry.running_order },
          status: 'registered',
        },
        orderBy: {
          running_order: 'desc',
        },
        select: {
          id: true,
          title: true,
          entry_number: true,
          running_order: true,
        },
      });

      if (!prevEntry) {
        return {
          success: false,
          atStart: true,
          message: 'Already at first routine',
        };
      }

      // Update live state to previous routine
      await prisma.live_competition_state.update({
        where: { competition_id: input.competitionId },
        data: {
          current_entry_id: prevEntry.id,
          current_entry_state: 'ready',
          current_entry_started_at: new Date(),
          playback_state: null,
          playback_position_ms: 0,
          playback_started_at: null,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        atStart: false,
        currentRoutineId: prevEntry.id,
        routineTitle: prevEntry.title,
        entryNumber: prevEntry.entry_number,
        runningOrder: prevEntry.running_order,
      };
    }),

  /**
   * Update playback state (playing, paused, stopped)
   */
  updatePlaybackState: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      playbackState: z.enum(['playing', 'paused', 'stopped']),
      positionMs: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      const updateData: Record<string, unknown> = {
        playback_state: input.playbackState,
        updated_at: new Date(),
      };

      if (input.playbackState === 'playing') {
        updateData.playback_started_at = new Date();
        if (input.positionMs !== undefined) {
          updateData.playback_position_ms = input.positionMs;
        }
      } else if (input.playbackState === 'paused' || input.playbackState === 'stopped') {
        if (input.positionMs !== undefined) {
          updateData.playback_position_ms = input.positionMs;
        }
      }

      await prisma.live_competition_state.update({
        where: { competition_id: input.competitionId },
        data: updateData,
      });

      return {
        success: true,
        playbackState: input.playbackState,
        positionMs: input.positionMs,
      };
    }),

  /**
   * Pause the competition (emergency pause)
   */
  pauseCompetition: publicProcedure
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

      await prisma.live_competition_state.update({
        where: { competition_id: input.competitionId },
        data: {
          competition_state: 'paused',
          paused_at: new Date(),
          playback_state: 'paused',
          updated_at: new Date(),
        },
      });

      return { success: true, state: 'paused' };
    }),

  /**
   * Resume the competition from pause
   */
  resumeCompetition: publicProcedure
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

      await prisma.live_competition_state.update({
        where: { competition_id: input.competitionId },
        data: {
          competition_state: 'active',
          paused_at: null,
          updated_at: new Date(),
        },
      });

      return { success: true, state: 'active' };
    }),

  /**
   * Start live mode for competition
   */
  startLiveMode: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      dayNumber: z.number().default(1),
      sessionNumber: z.number().default(1),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Tenant ID required',
        });
      }

      // Get first routine
      const firstEntry = await prisma.competition_entries.findFirst({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          status: 'registered',
        },
        orderBy: {
          running_order: 'asc',
        },
        select: {
          id: true,
          title: true,
          entry_number: true,
          running_order: true,
        },
      });

      // Upsert live state
      const liveState = await prisma.live_competition_state.upsert({
        where: {
          competition_id: input.competitionId,
        },
        create: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
          competition_state: 'active',
          current_entry_id: firstEntry?.id || null,
          current_entry_state: 'ready',
          day_number: input.dayNumber,
          session_number: input.sessionNumber,
          live_mode_started_at: new Date(),
        },
        update: {
          competition_state: 'active',
          current_entry_id: firstEntry?.id || null,
          current_entry_state: 'ready',
          day_number: input.dayNumber,
          session_number: input.sessionNumber,
          live_mode_started_at: new Date(),
          live_mode_ended_at: null,
          paused_at: null,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        stateId: liveState.id,
        competitionState: 'active',
        currentRoutineId: firstEntry?.id,
        routineTitle: firstEntry?.title,
      };
    }),

  /**
   * End live mode for competition
   */
  endLiveMode: publicProcedure
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

      await prisma.live_competition_state.update({
        where: { competition_id: input.competitionId },
        data: {
          competition_state: 'completed',
          live_mode_ended_at: new Date(),
          playback_state: null,
          updated_at: new Date(),
        },
      });

      return { success: true, state: 'completed' };
    }),

  // ===========================================
  // TASK 18: EMERGENCY BREAK & END EARLY
  // ===========================================

  addEmergencyBreak: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      durationMinutes: z.number().min(1).max(60),
      insertAfterEntryId: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      const liveState = await prisma.live_competition_state.findUnique({
        where: { competition_id: input.competitionId },
      });

      const activeBreak = await prisma.schedule_breaks.findFirst({
        where: { competition_id: input.competitionId, tenant_id: ctx.tenantId, status: 'active' },
      });

      if (activeBreak) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add break while another break is active' });
      }

      const emergencyBreak = await prisma.schedule_breaks.create({
        data: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          insert_after_entry_id: input.insertAfterEntryId || liveState?.current_entry_id || null,
          duration_minutes: input.durationMinutes,
          break_type: 'emergency',
          reason: input.reason || 'Emergency break',
          title: 'Emergency Break',
          status: 'active',
          actual_start_time: new Date(),
          created_by: ctx.userId || null,
        },
      });

      if (liveState) {
        const currentDelay = liveState.schedule_delay_minutes || 0;
        await prisma.live_competition_state.update({
          where: { competition_id: input.competitionId },
          data: { competition_state: 'break', schedule_delay_minutes: currentDelay + input.durationMinutes, updated_at: new Date() },
        });
      }

      return {
        success: true,
        breakId: emergencyBreak.id,
        durationMinutes: input.durationMinutes,
        newDelayMinutes: (liveState?.schedule_delay_minutes || 0) + input.durationMinutes,
        startedAt: emergencyBreak.actual_start_time,
      };
    }),

  endBreakEarly: publicProcedure
    .input(z.object({ breakId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      const breakRecord = await prisma.schedule_breaks.findFirst({
        where: { id: input.breakId, tenant_id: ctx.tenantId },
      });

      if (!breakRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Break not found' });
      }

      if (breakRecord.status !== 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Break is not active' });
      }

      const now = new Date();
      const startTime = breakRecord.actual_start_time || breakRecord.created_at;
      const actualDurationMs = now.getTime() - startTime.getTime();
      const actualDurationMinutes = Math.ceil(actualDurationMs / (1000 * 60));
      const timeSavedMinutes = Math.max(0, breakRecord.duration_minutes - actualDurationMinutes);

      await prisma.schedule_breaks.update({
        where: { id: input.breakId },
        data: { status: 'completed', actual_end_time: now, actual_duration_minutes: actualDurationMinutes, updated_at: now },
      });

      const liveState = await prisma.live_competition_state.findUnique({
        where: { competition_id: breakRecord.competition_id },
      });

      if (liveState) {
        const currentDelay = liveState.schedule_delay_minutes || 0;
        const newDelay = Math.max(0, currentDelay - timeSavedMinutes);
        await prisma.live_competition_state.update({
          where: { competition_id: breakRecord.competition_id },
          data: { competition_state: 'active', schedule_delay_minutes: newDelay, updated_at: now },
        });
      }

      return {
        success: true,
        actualDurationMinutes,
        timeSavedMinutes,
        newDelayMinutes: Math.max(0, (liveState?.schedule_delay_minutes || 0) - timeSavedMinutes),
      };
    }),

  getActiveBreak: publicProcedure
    .input(z.object({ competitionId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      const activeBreak = await prisma.schedule_breaks.findFirst({
        where: { competition_id: input.competitionId, tenant_id: ctx.tenantId, status: 'active' },
      });

      if (!activeBreak) return null;

      const now = new Date();
      const startTime = activeBreak.actual_start_time || activeBreak.created_at;
      const elapsedMs = now.getTime() - startTime.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
      const remainingMinutes = Math.max(0, activeBreak.duration_minutes - elapsedMinutes);

      return {
        id: activeBreak.id,
        breakType: activeBreak.break_type,
        title: activeBreak.title,
        reason: activeBreak.reason,
        durationMinutes: activeBreak.duration_minutes,
        elapsedMinutes,
        remainingMinutes,
        startedAt: startTime,
        scheduledEndTime: new Date(startTime.getTime() + activeBreak.duration_minutes * 60 * 1000),
      };
    }),

  // ===========================================
  // TASK 20: ROUTINE REORDER & SCRATCH
  // ===========================================

  /**
   * Reorder a routine in the running order
   * Entry number stays LOCKED, only running_order changes
   */
  reorderRoutine: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      routineId: z.string(),
      newPosition: z.number().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      // Get the routine to move
      const routine = await prisma.competition_entries.findFirst({
        where: { id: input.routineId, tenant_id: ctx.tenantId },
      });

      if (!routine) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
      }

      const currentPosition = routine.running_order || 0;
      if (currentPosition === input.newPosition) {
        return { success: true, message: 'No change needed', affectedCount: 0 };
      }

      // Get all routines for the same day
      const dayRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          performance_date: routine.performance_date,
          status: { not: 'withdrawn' },
        },
        orderBy: { running_order: 'asc' },
      });

      // Reorder logic
      const updates: { id: string; running_order: number }[] = [];

      if (input.newPosition < currentPosition) {
        // Moving up: shift routines between newPosition and currentPosition down
        for (const r of dayRoutines) {
          const order = r.running_order || 0;
          if (r.id === input.routineId) {
            updates.push({ id: r.id, running_order: input.newPosition });
          } else if (order >= input.newPosition && order < currentPosition) {
            updates.push({ id: r.id, running_order: order + 1 });
          }
        }
      } else {
        // Moving down: shift routines between currentPosition and newPosition up
        for (const r of dayRoutines) {
          const order = r.running_order || 0;
          if (r.id === input.routineId) {
            updates.push({ id: r.id, running_order: input.newPosition });
          } else if (order > currentPosition && order <= input.newPosition) {
            updates.push({ id: r.id, running_order: order - 1 });
          }
        }
      }

      // Execute updates
      for (const update of updates) {
        await prisma.competition_entries.update({
          where: { id: update.id },
          data: { running_order: update.running_order, updated_at: new Date() },
        });
      }

      // Fetch updated routines
      const updatedRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          performance_date: routine.performance_date,
          status: { not: 'withdrawn' },
        },
        orderBy: { running_order: 'asc' },
      });

      return {
        success: true,
        affectedCount: updates.length,
        updatedRoutines: updatedRoutines.map(r => ({
          id: r.id,
          entryNumber: r.entry_number,
          runningOrder: r.running_order,
          title: r.title,
        })),
      };
    }),

  /**
   * Scratch/withdraw a routine from the lineup
   * Entry number preserved (creates gap in sequence)
   */
  scratchRoutine: publicProcedure
    .input(z.object({
      routineId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      const routine = await prisma.competition_entries.findFirst({
        where: { id: input.routineId, tenant_id: ctx.tenantId },
      });

      if (!routine) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
      }

      if (routine.status === 'withdrawn') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Routine already withdrawn' });
      }

      // Update entry status to withdrawn
      await prisma.competition_entries.update({
        where: { id: input.routineId },
        data: {
          status: 'withdrawn',
          scheduling_notes: input.reason ? `Scratched: ${input.reason}` : 'Scratched',
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        routineId: input.routineId,
        entryNumber: routine.entry_number,
        reason: input.reason,
        message: `Routine ${routine.entry_number || routine.id} has been scratched`,
      };
    }),

  /**
   * Move a routine to a different competition day
   * Recalculates running_order for both source and target days
   */
  moveRoutineToDay: publicProcedure
    .input(z.object({
      routineId: z.string(),
      targetDay: z.string(), // ISO date string
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      const routine = await prisma.competition_entries.findFirst({
        where: { id: input.routineId, tenant_id: ctx.tenantId },
      });

      if (!routine) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
      }

      const sourceDay = routine.performance_date;
      const targetDay = new Date(input.targetDay);

      if (sourceDay && sourceDay.toDateString() === targetDay.toDateString()) {
        return { success: true, message: 'Already on target day', moved: false };
      }

      // Get max running_order for target day
      const targetDayRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: routine.competition_id,
          tenant_id: ctx.tenantId,
          performance_date: targetDay,
          status: { not: 'withdrawn' },
        },
        orderBy: { running_order: 'desc' },
        take: 1,
      });

      const newRunningOrder = (targetDayRoutines[0]?.running_order || 0) + 1;

      // Move the routine
      await prisma.competition_entries.update({
        where: { id: input.routineId },
        data: {
          performance_date: targetDay,
          running_order: newRunningOrder,
          updated_at: new Date(),
        },
      });

      // Reorder source day to close the gap
      if (sourceDay) {
        const sourceDayRoutines = await prisma.competition_entries.findMany({
          where: {
            competition_id: routine.competition_id,
            tenant_id: ctx.tenantId,
            performance_date: sourceDay,
            status: { not: 'withdrawn' },
          },
          orderBy: { running_order: 'asc' },
        });

        let order = 1;
        for (const r of sourceDayRoutines) {
          if (r.running_order !== order) {
            await prisma.competition_entries.update({
              where: { id: r.id },
              data: { running_order: order, updated_at: new Date() },
            });
          }
          order++;
        }
      }

      // Get counts for response
      const [sourceDayCount, targetDayCount] = await Promise.all([
        sourceDay ? prisma.competition_entries.count({
          where: {
            competition_id: routine.competition_id,
            tenant_id: ctx.tenantId,
            performance_date: sourceDay,
            status: { not: 'withdrawn' },
          },
        }) : 0,
        prisma.competition_entries.count({
          where: {
            competition_id: routine.competition_id,
            tenant_id: ctx.tenantId,
            performance_date: targetDay,
            status: { not: 'withdrawn' },
          },
        }),
      ]);

      return {
        success: true,
        moved: true,
        routineId: input.routineId,
        entryNumber: routine.entry_number,
        fromDay: sourceDay?.toISOString().split('T')[0],
        toDay: targetDay.toISOString().split('T')[0],
        newRunningOrder,
        sourceDayCount,
        targetDayCount,
      };
    }),

  // ===========================================
  // TASK 21: SCORE EDIT WITH AUDIT LOG
  // ===========================================

  /**
   * Edit a submitted score (CD only)
   * Creates audit log entry, updates score, recalculates entry score
   */
  editScore: publicProcedure
    .input(z.object({
      scoreId: z.string(),
      newValue: z.number().min(60).max(100),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      // Get the existing score
      const score = await prisma.scores.findFirst({
        where: { id: input.scoreId, tenant_id: ctx.tenantId },
        include: { competition_entries: true },
      });

      if (!score) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Score not found' });
      }

      const oldValue = score.total_score ? Number(score.total_score) : null;

      // Create audit log entry using raw SQL (table exists in DB but not in Prisma)
      await prisma.$executeRaw`
        INSERT INTO score_audit_log (
          score_id, entry_id, judge_id, tenant_id,
          previous_score, new_score, edit_type, edit_reason,
          edited_by, editor_role, edited_at
        ) VALUES (
          ${input.scoreId}::uuid,
          ${score.entry_id}::uuid,
          ${score.judge_id}::uuid,
          ${ctx.tenantId}::uuid,
          ${oldValue},
          ${input.newValue},
          'cd_edit',
          ${input.reason || null},
          ${ctx.userId || null}::uuid,
          'cd',
          NOW()
        )
      `;

      // Update the score
      await prisma.scores.update({
        where: { id: input.scoreId },
        data: {
          total_score: input.newValue,
          updated_at: new Date(),
        },
      });

      // Recalculate entry's calculated_score (average of all judge scores)
      const allScores = await prisma.scores.findMany({
        where: { entry_id: score.entry_id, tenant_id: ctx.tenantId },
      });

      const avgScore = allScores.length > 0
        ? allScores.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0) / allScores.length
        : null;

      if (avgScore !== null) {
        await prisma.competition_entries.update({
          where: { id: score.entry_id },
          data: {
            calculated_score: avgScore,
            updated_at: new Date(),
          },
        });
      }

      return {
        success: true,
        scoreId: input.scoreId,
        entryId: score.entry_id,
        oldValue,
        newValue: input.newValue,
        newCalculatedScore: avgScore,
        reason: input.reason,
      };
    }),

  /**
   * Get score edit history
   * Returns all audit log entries for a score or entry
   */
  getScoreHistory: publicProcedure
    .input(z.object({
      scoreId: z.string().optional(),
      entryId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      if (!input.scoreId && !input.entryId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either scoreId or entryId required' });
      }

      // Query audit log using raw SQL
      let history;
      if (input.scoreId) {
        history = await prisma.$queryRaw`
          SELECT
            id, score_id, entry_id, judge_id,
            previous_score, new_score, edit_type, edit_reason,
            edited_by, editor_role, edited_at
          FROM score_audit_log
          WHERE score_id = ${input.scoreId}::uuid
            AND tenant_id = ${ctx.tenantId}::uuid
          ORDER BY edited_at DESC
        `;
      } else {
        history = await prisma.$queryRaw`
          SELECT
            id, score_id, entry_id, judge_id,
            previous_score, new_score, edit_type, edit_reason,
            edited_by, editor_role, edited_at
          FROM score_audit_log
          WHERE entry_id = ${input.entryId}::uuid
            AND tenant_id = ${ctx.tenantId}::uuid
          ORDER BY edited_at DESC
        `;
      }

      return {
        history: history as Array<{
          id: string;
          score_id: string;
          entry_id: string;
          judge_id: string;
          previous_score: number | null;
          new_score: number;
          edit_type: string;
          edit_reason: string | null;
          edited_by: string;
          editor_role: string;
          edited_at: Date;
        }>,
      };
    }),

  // ===========================================
  // TASK 26: TITLE DIVISION SCORING SYSTEM
  // ===========================================

  /**
   * Submit title breakdown scores for a Title Division routine
   * 5 breakdown categories (20 points max each): Technique + 4 configurable
   */
  submitTitleBreakdown: publicProcedure
    .input(z.object({
      scoreId: z.string(),
      entryId: z.string(),
      judgeId: z.string(),
      techniqueScore: z.number().min(0).max(20),
      category2Score: z.number().min(0).max(20),
      category3Score: z.number().min(0).max(20),
      category4Score: z.number().min(0).max(20),
      category5Score: z.number().min(0).max(20),
      // Optional custom labels
      category2Label: z.string().optional(),
      category3Label: z.string().optional(),
      category4Label: z.string().optional(),
      category5Label: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      const totalBreakdown = input.techniqueScore + input.category2Score +
        input.category3Score + input.category4Score + input.category5Score;

      // Upsert breakdown scores using raw SQL
      await prisma.$executeRaw`
        INSERT INTO title_breakdown_scores (
          tenant_id, score_id, entry_id, judge_id,
          technique_score, category_2_score, category_3_score,
          category_4_score, category_5_score,
          category_2_label, category_3_label, category_4_label, category_5_label,
          total_breakdown, updated_at
        ) VALUES (
          ${ctx.tenantId}::uuid,
          ${input.scoreId}::uuid,
          ${input.entryId}::uuid,
          ${input.judgeId}::uuid,
          ${input.techniqueScore},
          ${input.category2Score},
          ${input.category3Score},
          ${input.category4Score},
          ${input.category5Score},
          ${input.category2Label || 'Execution'},
          ${input.category3Label || 'Artistry'},
          ${input.category4Label || 'Choreography'},
          ${input.category5Label || 'Performance'},
          ${totalBreakdown},
          NOW()
        )
        ON CONFLICT (score_id, tenant_id) DO UPDATE SET
          technique_score = EXCLUDED.technique_score,
          category_2_score = EXCLUDED.category_2_score,
          category_3_score = EXCLUDED.category_3_score,
          category_4_score = EXCLUDED.category_4_score,
          category_5_score = EXCLUDED.category_5_score,
          category_2_label = EXCLUDED.category_2_label,
          category_3_label = EXCLUDED.category_3_label,
          category_4_label = EXCLUDED.category_4_label,
          category_5_label = EXCLUDED.category_5_label,
          total_breakdown = EXCLUDED.total_breakdown,
          updated_at = NOW()
      `;

      return {
        success: true,
        scoreId: input.scoreId,
        totalBreakdown,
        maxPossible: 100,
      };
    }),

  /**
   * Get title breakdown scores for a score or entry
   */
  getTitleBreakdown: publicProcedure
    .input(z.object({
      scoreId: z.string().optional(),
      entryId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      if (!input.scoreId && !input.entryId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either scoreId or entryId required' });
      }

      let breakdowns;
      if (input.scoreId) {
        breakdowns = await prisma.$queryRaw`
          SELECT
            id, score_id, entry_id, judge_id,
            technique_score, category_2_score, category_3_score,
            category_4_score, category_5_score,
            category_2_label, category_3_label, category_4_label, category_5_label,
            total_breakdown, created_at, updated_at
          FROM title_breakdown_scores
          WHERE score_id = ${input.scoreId}::uuid
            AND tenant_id = ${ctx.tenantId}::uuid
        `;
      } else {
        breakdowns = await prisma.$queryRaw`
          SELECT
            id, score_id, entry_id, judge_id,
            technique_score, category_2_score, category_3_score,
            category_4_score, category_5_score,
            category_2_label, category_3_label, category_4_label, category_5_label,
            total_breakdown, created_at, updated_at
          FROM title_breakdown_scores
          WHERE entry_id = ${input.entryId}::uuid
            AND tenant_id = ${ctx.tenantId}::uuid
        `;
      }

      return {
        breakdowns: breakdowns as Array<{
          id: string;
          score_id: string;
          entry_id: string;
          judge_id: string;
          technique_score: number;
          category_2_score: number;
          category_3_score: number;
          category_4_score: number;
          category_5_score: number;
          category_2_label: string;
          category_3_label: string;
          category_4_label: string;
          category_5_label: string;
          total_breakdown: number;
          created_at: Date;
          updated_at: Date;
        }>,
      };
    }),

    // ============================================
    // TASK 27: Edge Case Alert System - Score Bumping Detection
    // ============================================

    // Level thresholds (configurable per competition)
    // Default: Platinum 95+, High Gold 90-94.99, Gold 85-89.99, High Silver 80-84.99, Silver 75-79.99, Bronze <75

    checkScoreBumpAlert: publicProcedure
      .input(z.object({
        entryId: z.string(),
        scores: z.array(z.object({
          judgeId: z.string(),
          judgeName: z.string(),
          score: z.number(),
        })).min(3).max(3),
        levelThresholds: z.array(z.object({
          name: z.string(),
          minScore: z.number(),
        })).optional(),
        sensitivityThreshold: z.number().optional(), // Default 0.5 - how close to boundary triggers alert
      }))
      .mutation(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        // Default level thresholds
        const thresholds = input.levelThresholds || [
          { name: 'Platinum', minScore: 95 },
          { name: 'High Gold', minScore: 90 },
          { name: 'Gold', minScore: 85 },
          { name: 'High Silver', minScore: 80 },
          { name: 'Silver', minScore: 75 },
          { name: 'Bronze', minScore: 0 },
        ];

        const sensitivity = input.sensitivityThreshold || 0.5;

        // Helper to get level from score
        const getLevel = (score: number) => {
          for (const t of thresholds) {
            if (score >= t.minScore) return t;
          }
          return thresholds[thresholds.length - 1];
        };

        // Calculate average with all scores
        const allScores = input.scores.map(s => s.score);
        const avgWithAll = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        const levelWithAll = getLevel(avgWithAll);

        const alerts: any[] = [];

        // Check each judge's impact
        for (const judgeScore of input.scores) {
          // Average without this judge
          const otherScores = input.scores.filter(s => s.judgeId !== judgeScore.judgeId).map(s => s.score);
          const avgWithout = otherScores.reduce((a, b) => a + b, 0) / otherScores.length;
          const levelWithout = getLevel(avgWithout);

          // Check if this judge caused a level change
          if (levelWithAll.name !== levelWithout.name) {
            // Find the threshold crossed
            const thresholdCrossed = levelWithout.minScore;
            const scoreDiff = Math.abs(judgeScore.score - (otherScores.reduce((a, b) => a + b, 0) / otherScores.length));

            // Only alert if the diff is small (edge case, not obvious)
            if (scoreDiff <= 2.0) { // Within 2 points of other judges' average
              // Create alert in database
              await prisma.$executeRaw`
                INSERT INTO score_bump_alerts (
                  tenant_id, entry_id, judge_id, judge_name,
                  judge_score, other_scores, average_with, average_without,
                  score_diff, level_with, level_without, threshold_value, status
                ) VALUES (
                  ${tenantId}::uuid, ${input.entryId}::uuid, ${judgeScore.judgeId}::uuid, ${judgeScore.judgeName},
                  ${judgeScore.score}, ARRAY[${otherScores[0]}, ${otherScores[1]}]::decimal[], ${avgWithAll}, ${avgWithout},
                  ${scoreDiff}, ${levelWithAll.name}, ${levelWithout.name}, ${thresholdCrossed}, 'active'
                )
              `;

              alerts.push({
                judgeId: judgeScore.judgeId,
                judgeName: judgeScore.judgeName,
                judgeScore: judgeScore.score,
                otherScores,
                averageWithAll: avgWithAll,
                averageWithoutJudge: avgWithout,
                scoreDifference: scoreDiff,
                levelWithJudge: levelWithAll.name,
                levelWithoutJudge: levelWithout.name,
                thresholdCrossed,
                message: `${judgeScore.judgeName}'s score of ${judgeScore.score} causes level to drop from ${levelWithout.name} to ${levelWithAll.name}. Difference from other judges: ${scoreDiff.toFixed(2)} points.`,
              });
            }
          }
        }

        return {
          hasAlert: alerts.length > 0,
          alerts,
          summary: {
            entryId: input.entryId,
            scores: input.scores,
            average: avgWithAll,
            level: levelWithAll.name,
          },
        };
      }),

    getActiveAlerts: publicProcedure
      .input(z.object({
        entryId: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        let alerts;
        if (input.entryId) {
          alerts = await prisma.$queryRaw`
            SELECT * FROM score_bump_alerts
            WHERE tenant_id = ${tenantId}::uuid
              AND entry_id = ${input.entryId}::uuid
              AND status = 'active'
            ORDER BY created_at DESC
            LIMIT ${input.limit || 50}
          `;
        } else {
          alerts = await prisma.$queryRaw`
            SELECT * FROM score_bump_alerts
            WHERE tenant_id = ${tenantId}::uuid
              AND status = 'active'
            ORDER BY created_at DESC
            LIMIT ${input.limit || 50}
          `;
        }

        return { alerts };
      }),

    dismissAlert: publicProcedure
      .input(z.object({
        alertId: z.string(),
        dismissedBy: z.string(),
        resolutionNotes: z.string().optional(),
        newStatus: z.enum(['dismissed', 'resolved']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        const status = input.newStatus || 'dismissed';

        await prisma.$executeRaw`
          UPDATE score_bump_alerts
          SET status = ${status},
              dismissed_by = ${input.dismissedBy}::uuid,
              dismissed_at = NOW(),
              resolution_notes = ${input.resolutionNotes || null},
              updated_at = NOW()
          WHERE id = ${input.alertId}::uuid
            AND tenant_id = ${tenantId}::uuid
        `;

        return { success: true, alertId: input.alertId, status };
      }),

    // ============================================
    // TASK 30: Music Upload System
    // ============================================

    // Register music file upload (after file uploaded to Supabase Storage)
    registerMusicUpload: publicProcedure
      .input(z.object({
        entryId: z.string(),
        studioId: z.string(),
        fileName: z.string(),
        originalName: z.string().optional(),
        fileSize: z.number().optional(),
        durationSeconds: z.number().optional(),
        storagePath: z.string(),
        storageBucket: z.string().optional(),
        uploadedBy: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        const bucket = input.storageBucket || 'music-files';

        // Upsert: if music already exists for this entry, update it
        await prisma.$executeRaw`
          INSERT INTO music_files (
            tenant_id, entry_id, studio_id, file_name, original_name,
            file_size, duration_seconds, storage_path, storage_bucket,
            status, uploaded_by, uploaded_at
          ) VALUES (
            ${tenantId}::uuid, ${input.entryId}::uuid, ${input.studioId}::uuid,
            ${input.fileName}, ${input.originalName || null},
            ${input.fileSize || null}, ${input.durationSeconds || null},
            ${input.storagePath}, ${bucket},
            'complete', ${input.uploadedBy || null}::uuid, NOW()
          )
          ON CONFLICT (entry_id, tenant_id)
          DO UPDATE SET
            file_name = EXCLUDED.file_name,
            original_name = EXCLUDED.original_name,
            file_size = EXCLUDED.file_size,
            duration_seconds = EXCLUDED.duration_seconds,
            storage_path = EXCLUDED.storage_path,
            storage_bucket = EXCLUDED.storage_bucket,
            status = 'complete',
            uploaded_by = EXCLUDED.uploaded_by,
            uploaded_at = NOW(),
            updated_at = NOW()
        `;

        return { success: true, entryId: input.entryId };
      }),

    // Get music file for an entry
    getEntryMusic: publicProcedure
      .input(z.object({
        entryId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        const music = await prisma.$queryRaw`
          SELECT * FROM music_files
          WHERE tenant_id = ${tenantId}::uuid
            AND entry_id = ${input.entryId}::uuid
            AND status = 'complete'
          LIMIT 1
        ` as any[];

        return { music: music[0] || null };
      }),

    // Check music status for a studio (all their entries)
    getStudioMusicStatus: publicProcedure
      .input(z.object({
        studioId: z.string(),
        competitionId: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        // Get all entries for this studio with their music status
        const entries = await prisma.$queryRaw`
          SELECT
            ce.id as entry_id,
            ce.entry_number,
            ce.routine_name,
            mf.id as music_id,
            mf.status as music_status,
            mf.file_name,
            CASE WHEN mf.status = 'complete' THEN true ELSE false END as has_music
          FROM competition_entries ce
          LEFT JOIN music_files mf ON mf.entry_id = ce.id AND mf.tenant_id = ce.tenant_id
          WHERE ce.tenant_id = ${tenantId}::uuid
            AND ce.studio_id = ${input.studioId}::uuid
            AND ce.status != 'cancelled'
          ORDER BY ce.entry_number
        ` as any[];

        const totalEntries = entries.length;
        const entriesWithMusic = entries.filter((e: any) => e.has_music).length;
        const allMusicUploaded = totalEntries > 0 && entriesWithMusic === totalEntries;

        return {
          entries,
          summary: {
            totalEntries,
            entriesWithMusic,
            entriesMissingMusic: totalEntries - entriesWithMusic,
            allMusicUploaded,
            percentComplete: totalEntries > 0 ? Math.round((entriesWithMusic / totalEntries) * 100) : 0,
          },
        };
      }),

    // Missing music report for Competition Director
    getMissingMusicReport: publicProcedure
      .input(z.object({
        competitionId: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        // Get studios with missing music
        const report = await prisma.$queryRaw`
          SELECT
            s.id as studio_id,
            s.name as studio_name,
            s.email as studio_email,
            s.studio_code,
            COUNT(ce.id) as total_entries,
            COUNT(mf.id) FILTER (WHERE mf.status = 'complete') as entries_with_music,
            COUNT(ce.id) - COUNT(mf.id) FILTER (WHERE mf.status = 'complete') as entries_missing_music,
            ARRAY_AGG(
              CASE WHEN mf.status IS NULL OR mf.status != 'complete'
              THEN JSON_BUILD_OBJECT(
                'entry_id', ce.id,
                'entry_number', ce.entry_number,
                'routine_name', ce.routine_name
              )
              ELSE NULL END
            ) FILTER (WHERE mf.status IS NULL OR mf.status != 'complete') as missing_entries
          FROM studios s
          JOIN competition_entries ce ON ce.studio_id = s.id AND ce.tenant_id = s.tenant_id
          LEFT JOIN music_files mf ON mf.entry_id = ce.id AND mf.tenant_id = ce.tenant_id
          WHERE s.tenant_id = ${tenantId}::uuid
            AND ce.status != 'cancelled'
          GROUP BY s.id, s.name, s.email, s.studio_code
          HAVING COUNT(ce.id) - COUNT(mf.id) FILTER (WHERE mf.status = 'complete') > 0
          ORDER BY entries_missing_music DESC
        ` as any[];

        // Summary stats
        const totalStudiosWithMissing = report.length;
        const totalMissingFiles = report.reduce((sum: number, s: any) => sum + Number(s.entries_missing_music), 0);

        return {
          studios: report,
          summary: {
            totalStudiosWithMissing,
            totalMissingFiles,
          },
        };
      }),

    // Delete music file
    deleteMusicFile: publicProcedure
      .input(z.object({
        entryId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        // Get the storage path before deleting (for cleanup)
        const existing = await prisma.$queryRaw`
          SELECT storage_path, storage_bucket FROM music_files
          WHERE tenant_id = ${tenantId}::uuid
            AND entry_id = ${input.entryId}::uuid
        ` as any[];

        // Delete the record
        await prisma.$executeRaw`
          DELETE FROM music_files
          WHERE tenant_id = ${tenantId}::uuid
            AND entry_id = ${input.entryId}::uuid
        `;

        return {
          success: true,
          deletedFile: existing[0] || null,
          // Note: Caller should also delete from Supabase Storage using the path
        };
      }),

    // ============================================
    // TASK 11: Offline Score Caching - Server Sync APIs
    // ============================================

    // Batch sync offline scores to server
    syncOfflineScores: publicProcedure
      .input(z.object({
        scores: z.array(z.object({
          localId: z.string(), // Client-side IndexedDB key for confirmation
          entryId: z.string(),
          judgeId: z.string(),
          score: z.number().min(0).max(99.99),
          comments: z.string().optional(),
          submittedAt: z.string(), // ISO timestamp from client
          clientTimestamp: z.number(), // Unix timestamp for ordering
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        const results: { localId: string; serverId: string | null; status: 'synced' | 'duplicate' | 'error'; error?: string }[] = [];

        for (const score of input.scores) {
          try {
            // Check if this score already exists (duplicate prevention)
            const existing = await prisma.$queryRaw`
              SELECT id FROM scores
              WHERE tenant_id = ${tenantId}::uuid
                AND entry_id = ${score.entryId}::uuid
                AND judge_id = ${score.judgeId}::uuid
              LIMIT 1
            ` as any[];

            if (existing.length > 0) {
              // Already exists - might be from a previous sync
              results.push({
                localId: score.localId,
                serverId: existing[0].id,
                status: 'duplicate',
              });
              continue;
            }

            // Insert new score
            const newId = await prisma.$queryRaw`
              INSERT INTO scores (
                tenant_id, entry_id, judge_id, score, comments, submitted_at, created_at
              ) VALUES (
                ${tenantId}::uuid, ${score.entryId}::uuid, ${score.judgeId}::uuid,
                ${score.score}, ${score.comments || null},
                ${score.submittedAt}::timestamptz, NOW()
              )
              RETURNING id
            ` as any[];

            results.push({
              localId: score.localId,
              serverId: newId[0]?.id || null,
              status: 'synced',
            });
          } catch (error: any) {
            results.push({
              localId: score.localId,
              serverId: null,
              status: 'error',
              error: error.message,
            });
          }
        }

        return {
          syncedCount: results.filter(r => r.status === 'synced').length,
          duplicateCount: results.filter(r => r.status === 'duplicate').length,
          errorCount: results.filter(r => r.status === 'error').length,
          results,
        };
      }),

    // Get sync status for scores (by local IDs or entry IDs)
    getScoreSyncStatus: publicProcedure
      .input(z.object({
        entryIds: z.array(z.string()).optional(),
        judgeId: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        let scores;
        if (input.entryIds && input.entryIds.length > 0) {
          // Get scores for specific entries
          scores = await prisma.$queryRaw`
            SELECT id, entry_id, judge_id, score, submitted_at, created_at
            FROM scores
            WHERE tenant_id = ${tenantId}::uuid
              AND entry_id = ANY(${input.entryIds}::uuid[])
            ORDER BY created_at DESC
          `;
        } else if (input.judgeId) {
          // Get recent scores for a judge
          scores = await prisma.$queryRaw`
            SELECT id, entry_id, judge_id, score, submitted_at, created_at
            FROM scores
            WHERE tenant_id = ${tenantId}::uuid
              AND judge_id = ${input.judgeId}::uuid
            ORDER BY created_at DESC
            LIMIT 100
          `;
        } else {
          scores = [];
        }

        return { scores };
      }),

    // Check if a specific score exists (for duplicate prevention)
    checkScoreExists: publicProcedure
      .input(z.object({
        entryId: z.string(),
        judgeId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        const tenantId = ctx.tenantId;
        if (!tenantId) throw new Error('Tenant context required');

        const existing = await prisma.$queryRaw`
          SELECT id, score, submitted_at FROM scores
          WHERE tenant_id = ${tenantId}::uuid
            AND entry_id = ${input.entryId}::uuid
            AND judge_id = ${input.judgeId}::uuid
          LIMIT 1
        ` as any[];

        return {
          exists: existing.length > 0,
          score: existing[0] || null,
        };
      }),


  // ===========================================
  // TASK 23: SCHEDULE DELAY CALCULATOR
  // ===========================================

  /**
   * Get current schedule delay
   * Calculates planned vs actual time for the current routine
   */
  getScheduleDelay: publicProcedure
    .input(z.object({
      competitionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      // Get live state
      const liveState = await prisma.live_competition_state.findFirst({
        where: { competition_id: input.competitionId, tenant_id: ctx.tenantId },
      });

      if (!liveState || liveState.competition_state === 'not_started') {
        return {
          delayMinutes: 0,
          status: 'not_started',
          currentEntryId: null,
          plannedTime: null,
          actualTime: null,
          completedCount: 0,
          totalCount: 0,
        };
      }

      // Get competition date for today's routines
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all routines for today
      const todayRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          performance_date: today,
          status: { not: 'withdrawn' },
        },
        orderBy: { running_order: 'asc' },
        select: {
          id: true,
          entry_number: true,
          title: true,
          running_order: true,
          performance_time: true,
          mp3_duration_ms: true,
          status: true,
        },
      });

      const completedCount = todayRoutines.filter(r => r.status === 'scored').length;
      const totalCount = todayRoutines.length;

      // Find current routine
      const currentRoutine = liveState.current_entry_id
        ? todayRoutines.find(r => r.id === liveState.current_entry_id)
        : todayRoutines.find(r => r.status !== 'scored');

      // Calculate delay based on stored value and current time
      const storedDelay = liveState.schedule_delay_minutes || 0;

      return {
        delayMinutes: storedDelay,
        status: liveState.competition_state,
        currentEntryId: currentRoutine?.id || null,
        currentEntryNumber: currentRoutine?.entry_number || null,
        currentEntryTitle: currentRoutine?.title || null,
        plannedTime: currentRoutine?.performance_time?.toISOString() || null,
        actualTime: new Date().toISOString(),
        completedCount,
        totalCount,
        percentComplete: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      };
    }),

  /**
   * Recalculate all schedule times based on current state
   * Uses mp3_duration_ms and accounts for breaks
   */
  recalculateScheduleTimes: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      startFromEntryId: z.string().optional(),
      competitionDay: z.string().optional(), // ISO date string
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      // Determine which day to recalculate
      const targetDay = input.competitionDay ? new Date(input.competitionDay) : new Date();
      targetDay.setHours(0, 0, 0, 0);

      // Get all routines for the day
      const dayRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          performance_date: targetDay,
          status: { not: 'withdrawn' },
        },
        orderBy: { running_order: 'asc' },
        select: {
          id: true,
          entry_number: true,
          running_order: true,
          performance_time: true,
          mp3_duration_ms: true,
        },
      });

      if (dayRoutines.length === 0) {
        return { success: true, updatedCount: 0, message: 'No routines for this day' };
      }

      // Find the starting point
      let startIndex = 0;
      if (input.startFromEntryId) {
        const idx = dayRoutines.findIndex(r => r.id === input.startFromEntryId);
        if (idx >= 0) startIndex = idx;
      }

      // Get the base time (first routine's time or 9 AM default)
      const firstRoutine = dayRoutines[0];
      let baseTime: Date;
      if (firstRoutine.performance_time) {
        baseTime = new Date(targetDay);
        const perfTime = new Date(firstRoutine.performance_time);
        baseTime.setHours(perfTime.getUTCHours(), perfTime.getUTCMinutes(), 0, 0);
      } else {
        baseTime = new Date(targetDay);
        baseTime.setHours(9, 0, 0, 0); // Default 9 AM start
      }

      // Calculate cumulative time from start
      let currentTime = baseTime.getTime();
      const DEFAULT_DURATION_MS = 3 * 60 * 1000; // 3 minutes default
      const BUFFER_MS = 30 * 1000; // 30 seconds between routines

      // Calculate time for routines before start point
      for (let i = 0; i < startIndex; i++) {
        const routine = dayRoutines[i];
        const durationMs = routine.mp3_duration_ms || DEFAULT_DURATION_MS;
        currentTime += durationMs + BUFFER_MS;
      }

      // Update performance times from start point
      const updates: { id: string; newTime: Date }[] = [];

      for (let i = startIndex; i < dayRoutines.length; i++) {
        const routine = dayRoutines[i];
        const newTime = new Date(currentTime);

        // Only update if time changed
        updates.push({ id: routine.id, newTime });

        // Calculate duration for next routine
        const durationMs = routine.mp3_duration_ms || DEFAULT_DURATION_MS;
        currentTime += durationMs + BUFFER_MS;
      }

      // Batch update using raw SQL
      let updatedCount = 0;
      for (const update of updates) {
        const timeString = update.newTime.toTimeString().split(' ')[0];

        await prisma.$executeRaw`
          UPDATE competition_entries
          SET performance_time = ${timeString}::time,
              updated_at = NOW()
          WHERE id = ${update.id}::uuid
            AND tenant_id = ${ctx.tenantId}::uuid
        `;
        updatedCount++;
      }

      // Calculate new estimated end time
      const estimatedEndTime = new Date(currentTime);

      return {
        success: true,
        updatedCount,
        firstRoutineTime: baseTime.toISOString(),
        estimatedEndTime: estimatedEndTime.toISOString(),
        routinesProcessed: dayRoutines.length,
      };
    }),

  /**
   * Update schedule delay manually (CD adjustment)
   */
  updateScheduleDelay: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      delayMinutes: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      await prisma.live_competition_state.update({
        where: {
          competition_id: input.competitionId,
        },
        data: {
          schedule_delay_minutes: input.delayMinutes,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        newDelayMinutes: input.delayMinutes,
      };
    }),

  /**
   * Task 24: Get judge score visibility setting
   * Returns whether judges can see other judges' scores
   */
  getScoreVisibility: publicProcedure
    .input(z.object({
      competitionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      const liveState = await prisma.live_competition_state.findUnique({
        where: {
          competition_id: input.competitionId,
        },
        select: {
          judges_can_see_scores: true,
        },
      });

      // Default to false if no live state exists
      return {
        visible: liveState?.judges_can_see_scores ?? false,
      };
    }),

  /**
   * Task 24: Set judge score visibility
   * CD can toggle whether judges see other judges' scores
   */
  setScoreVisibility: publicProcedure
    .input(z.object({
      competitionId: z.string(),
      visible: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Tenant ID required' });
      }

      // Upsert to handle case where live state doesn't exist yet
      await prisma.live_competition_state.upsert({
        where: {
          competition_id: input.competitionId,
        },
        create: {
          tenant_id: ctx.tenantId,
          competition_id: input.competitionId,
          judges_can_see_scores: input.visible,
          competition_state: 'not_started',
        },
        update: {
          judges_can_see_scores: input.visible,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        visible: input.visible,
      };
    }),

});
