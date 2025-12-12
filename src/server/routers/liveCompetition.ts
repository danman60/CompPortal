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


});
