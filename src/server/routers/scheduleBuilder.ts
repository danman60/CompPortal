import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

/**
 * Schedule Router - Advanced Scheduling Suite
 * Handles drag-drop scheduling, routine numbers, conflicts, and SD suggestions
 */

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createScheduleSchema = z.object({
  competitionId: z.string().uuid(),
});

const lockScheduleSchema = z.object({
  scheduleId: z.string().uuid(),
});

const createScheduleItemSchema = z.object({
  scheduleId: z.string().uuid(),
  itemType: z.enum(['routine', 'break']),
  entryId: z.string().uuid().optional(),
  routineNumber: z.number().min(100).max(999).optional(),
  breakType: z.enum(['lunch', 'break', 'awards']).optional(),
  breakLabel: z.string().max(100).optional(),
  dayNumber: z.number().min(1).max(4),
  sessionNumber: z.number().min(1).max(4),
  runningOrder: z.number().min(1),
  startTime: z.string().optional(), // HH:MM format
  durationMinutes: z.number().min(1).default(5),
});

const updateScheduleItemSchema = z.object({
  id: z.string().uuid(),
  dayNumber: z.number().min(1).max(4).optional(),
  sessionNumber: z.number().min(1).max(4).optional(),
  runningOrder: z.number().min(1).optional(),
  startTime: z.string().optional(),
  durationMinutes: z.number().min(1).optional(),
  routineNumber: z.number().min(100).max(999).optional(),
});

const reorderItemsSchema = z.object({
  scheduleId: z.string().uuid(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      runningOrder: z.number().min(1),
      dayNumber: z.number().min(1).max(4),
      sessionNumber: z.number().min(1).max(4),
    })
  ),
});

const createSuggestionSchema = z.object({
  scheduleId: z.string().uuid(),
  studioId: z.string().uuid(),
  suggestionType: z.string().max(50),
  details: z.record(z.any()),
  notes: z.string().optional(),
});

const reviewSuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reviewedBy: z.string().uuid(),
});

// ============================================
// ROUTER PROCEDURES
// ============================================

export const scheduleBuilderRouter = router({
  /**
   * Get schedule for a competition
   */
  getByCompetition: publicProcedure
    .input(z.object({ competitionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const schedule = await prisma.schedules.findFirst({
        where: { competition_id: input.competitionId },
        include: {
          schedule_items: {
            include: {
              competition_entries: {
                include: {
                  dance_categories: true,
                  entry_size_categories: true,
                  age_groups: true,
                  studios: true,
                  entry_participants: {
                    include: {
                      dancers: true,
                    },
                  },
                },
              },
            },
            orderBy: [
              { day_number: 'asc' },
              { session_number: 'asc' },
              { running_order: 'asc' },
            ],
          },
          schedule_conflicts: {
            orderBy: { severity: 'desc' },
          },
          schedule_suggestions: {
            orderBy: { created_at: 'desc' },
          },
        },
      });

      return schedule;
    }),

  /**
   * Create new schedule for competition
   */
  create: publicProcedure
    .input(createScheduleSchema)
    .mutation(async ({ input, ctx }) => {
      // Authorization check - Competition Director or Super Admin only
      if (!ctx.userId || !['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only Competition Directors can create schedules' });
      }

      const schedule = await prisma.schedules.create({
        data: {
          competition_id: input.competitionId,
          status: 'draft',
          created_by: ctx.userId,
        },
      });

      return schedule;
    }),

  /**
   * Auto-generate schedule from confirmed entries
   */
  autoGenerate: publicProcedure
    .input(z.object({ competitionId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      if (!ctx.userId || !['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Get or create schedule
      let schedule = await prisma.schedules.findFirst({
        where: { competition_id: input.competitionId },
      });

      if (!schedule) {
        schedule = await prisma.schedules.create({
          data: {
            competition_id: input.competitionId,
            status: 'draft',
            created_by: ctx.userId,
          },
        });
      }

      // Get all confirmed entries
      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          status: 'confirmed',
        },
        include: {
          dance_categories: true,
          entry_size_categories: true,
          age_groups: true,
          entry_participants: {
            include: {
              dancers: true,
            },
          },
        },
        orderBy: [
          { entry_size_categories: { sort_order: 'asc' } },
          { dance_categories: { sort_order: 'asc' } },
          { age_groups: { min_age: 'asc' } },
        ],
      });

      // Simple auto-scheduling logic (placeholder for complex logic)
      let routineNumber = 100;
      let dayNumber = 1;
      let sessionNumber = 1;
      let runningOrder = 1;

      const items = [];

      for (const entry of entries) {
        items.push({
          schedule_id: schedule.id,
          item_type: 'routine',
          entry_id: entry.id,
          routine_number: routineNumber,
          day_number: dayNumber,
          session_number: sessionNumber,
          running_order: runningOrder,
          duration_minutes: 5, // Default routine duration
        });

        routineNumber++;
        runningOrder++;

        // Add awards ceremony after every 20 routines (placeholder logic)
        if (runningOrder % 20 === 0) {
          items.push({
            schedule_id: schedule.id,
            item_type: 'break',
            break_type: 'awards',
            break_label: `Session ${sessionNumber} Awards`,
            day_number: dayNumber,
            session_number: sessionNumber,
            running_order: runningOrder,
            duration_minutes: 30,
          });
          runningOrder++;
          sessionNumber++;

          // Move to next day after 4 sessions
          if (sessionNumber > 4) {
            sessionNumber = 1;
            dayNumber++;
          }
        }
      }

      // Delete existing items and create new ones
      await prisma.schedule_items.deleteMany({
        where: { schedule_id: schedule.id },
      });

      await prisma.schedule_items.createMany({
        data: items,
      });

      return { schedule, itemCount: items.length };
    }),

  /**
   * Lock schedule - routine numbers become permanent
   */
  lock: publicProcedure
    .input(lockScheduleSchema)
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      if (!ctx.userId || !['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const schedule = await prisma.schedules.findUnique({
        where: { id: input.scheduleId },
        include: { schedule_items: true },
      });

      if (!schedule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      }

      if (schedule.status === 'locked') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Schedule is already locked' });
      }

      // Copy routine numbers to competition_entries (denormalize for locked state)
      for (const item of schedule.schedule_items) {
        if (item.item_type === 'routine' && item.entry_id && item.routine_number) {
          await prisma.competition_entries.update({
            where: { id: item.entry_id },
            data: { entry_number: item.routine_number },
          });
        }
      }

      // Lock the schedule
      const locked = await prisma.schedules.update({
        where: { id: input.scheduleId },
        data: {
          status: 'locked',
          locked_at: new Date(),
        },
      });

      return locked;
    }),

  /**
   * Add schedule item (routine or break)
   */
  addItem: publicProcedure
    .input(createScheduleItemSchema)
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      if (!ctx.userId || !['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const item = await prisma.schedule_items.create({
        data: {
          schedule_id: input.scheduleId,
          item_type: input.itemType,
          entry_id: input.entryId,
          routine_number: input.routineNumber,
          break_type: input.breakType,
          break_label: input.breakLabel,
          day_number: input.dayNumber,
          session_number: input.sessionNumber,
          running_order: input.runningOrder,
          start_time: input.startTime,
          duration_minutes: input.durationMinutes,
        },
      });

      return item;
    }),

  /**
   * Update schedule item
   */
  updateItem: publicProcedure
    .input(updateScheduleItemSchema)
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      if (!ctx.userId || !['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const { id, ...data } = input;

      const item = await prisma.schedule_items.update({
        where: { id },
        data: {
          day_number: data.dayNumber,
          session_number: data.sessionNumber,
          running_order: data.runningOrder,
          start_time: data.startTime,
          duration_minutes: data.durationMinutes,
          routine_number: data.routineNumber,
          updated_at: new Date(),
        },
      });

      return item;
    }),

  /**
   * Bulk reorder items (drag-drop support)
   */
  reorderItems: publicProcedure
    .input(reorderItemsSchema)
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      if (!ctx.userId || !['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Update all items in transaction
      await prisma.$transaction(
        input.items.map((item) =>
          prisma.schedule_items.update({
            where: { id: item.id },
            data: {
              running_order: item.runningOrder,
              day_number: item.dayNumber,
              session_number: item.sessionNumber,
              updated_at: new Date(),
            },
          })
        )
      );

      return { success: true, updated: input.items.length };
    }),

  /**
   * Delete schedule item
   */
  deleteItem: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      if (!ctx.userId || !['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await prisma.schedule_items.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Detect conflicts (back-to-back dancers, etc.)
   */
  detectConflicts: publicProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const items = await prisma.schedule_items.findMany({
        where: {
          schedule_id: input.scheduleId,
          item_type: 'routine',
        },
        include: {
          competition_entries: {
            include: {
              entry_participants: {
                include: {
                  dancers: true,
                },
              },
            },
          },
        },
        orderBy: [
          { day_number: 'asc' },
          { session_number: 'asc' },
          { running_order: 'asc' },
        ],
      });

      // Clear existing conflicts
      await prisma.schedule_conflicts.deleteMany({
        where: { schedule_id: input.scheduleId },
      });

      const conflicts: any[] = [];
      const dancerAppearances: Record<string, number[]> = {};

      // Track dancer appearances by running order
      items.forEach((item, index) => {
        item.competition_entries?.entry_participants?.forEach((participant) => {
          const dancerId = participant.dancer_id;
          if (!dancerAppearances[dancerId]) {
            dancerAppearances[dancerId] = [];
          }
          dancerAppearances[dancerId].push(index);
        });
      });

      // Detect conflicts: dancers appearing within 3 routines
      for (const [dancerId, appearances] of Object.entries(dancerAppearances)) {
        for (let i = 0; i < appearances.length - 1; i++) {
          const gap = appearances[i + 1] - appearances[i];
          if (gap < 3) {
            const entry1 = items[appearances[i]].competition_entries;
            const entry2 = items[appearances[i + 1]].competition_entries;

            if (entry1 && entry2) {
              conflicts.push({
                schedule_id: input.scheduleId,
                conflict_type: 'back_to_back_dancer',
                entry_ids: [entry1.id, entry2.id],
                dancer_ids: [dancerId],
                severity: gap === 1 ? 'critical' : 'warning',
                description: `Dancer appears in routines with only ${gap} routine(s) in between (needs 3+ for costume changes)`,
              });
            }
          }
        }
      }

      // Save conflicts to database
      if (conflicts.length > 0) {
        await prisma.schedule_conflicts.createMany({
          data: conflicts,
        });
      }

      return { conflicts, count: conflicts.length };
    }),

  /**
   * Get all suggestions for a schedule (CD view)
   */
  getSuggestions: publicProcedure
    .input(z.object({ scheduleId: z.string().uuid() }))
    .query(async ({ input }) => {
      const suggestions = await prisma.schedule_suggestions.findMany({
        where: { schedule_id: input.scheduleId },
        include: {
          studios: true,
          users_suggested: true,
          users_reviewed: true,
        },
        orderBy: { created_at: 'desc' },
      });

      return suggestions;
    }),

  /**
   * Create suggestion (SD sandbox)
   */
  createSuggestion: publicProcedure
    .input(createSuggestionSchema)
    .mutation(async ({ input, ctx }) => {
      // Authorization check - Studio Directors can suggest
      if (!ctx.userId || !['studio_director', 'competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const suggestion = await prisma.schedule_suggestions.create({
        data: {
          schedule_id: input.scheduleId,
          studio_id: input.studioId,
          suggested_by_user_id: ctx.userId,
          suggestion_type: input.suggestionType,
          details: input.details,
          notes: input.notes,
          status: 'pending',
        },
      });

      return suggestion;
    }),

  /**
   * Review suggestion (CD approve/reject)
   */
  reviewSuggestion: publicProcedure
    .input(reviewSuggestionSchema)
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      if (!ctx.userId || !['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const suggestion = await prisma.schedule_suggestions.update({
        where: { id: input.suggestionId },
        data: {
          status: input.status,
          reviewed_by: input.reviewedBy,
          reviewed_at: new Date(),
        },
      });

      return suggestion;
    }),
});
