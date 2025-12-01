import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import {
  SchedulingEntry,
  SessionCapacity,
  SchedulingConstraints,
  DEFAULT_CONSTRAINTS,
  getAllConflicts,
  autoScheduleSession,
  calculateSessionStats,
  validateSchedule,
  getMinutesDifference,
} from '@/lib/scheduling';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import icalGenerator from 'ical-generator';

// ============================================================================
// TIME CONVERSION HELPERS (Rebuild Spec Section 3)
// ============================================================================
// These helpers standardize time format conversion between:
// - Frontend: "HH:MM:SS" strings (e.g., "08:00:00")
// - Database: PostgreSQL TIME fields stored as DateTime objects
//
// Contract:
// 1. Frontend always sends/receives "HH:MM:SS" strings
// 2. Backend converts to/from DateTime only for database operations
// 3. No timezone math - use UTC getters for consistency
// ============================================================================

export type TimeString = string; // Format: "HH:MM:SS" (e.g., "08:00:00")
export type DateString = string; // Format: "YYYY-MM-DD" (e.g., "2026-04-09")

/**
 * Convert TimeString to Prisma DateTime (for saving to TIME fields)
 * @param timeString Format: "HH:MM:SS" (e.g., "08:00:00")
 * @returns Date object with dummy date 1970-01-01 + time
 * @example timeStringToDateTime("08:00:00") → Date("1970-01-01T08:00:00Z")
 */
export function timeStringToDateTime(timeString: TimeString): Date {
  return new Date(`1970-01-01T${timeString}Z`);
}

/**
 * Convert Prisma DateTime (from TIME fields) to TimeString
 * @param dateTime Date object from Prisma TIME field
 * @returns Format: "HH:MM:SS" (e.g., "08:00:00")
 * @example dateTimeToTimeString(Date("1970-01-01T08:00:00Z")) → "08:00:00"
 */
export function dateTimeToTimeString(dateTime: Date): TimeString {
  const hours = dateTime.getUTCHours().toString().padStart(2, '0');
  const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
  const seconds = dateTime.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Add minutes to a TimeString
 * @param timeString Format: "HH:MM:SS"
 * @param minutes Number of minutes to add
 * @returns New TimeString with added minutes
 * @example addMinutesToTimeString("08:00:00", 3) → "08:03:00"
 */
export function addMinutesToTimeString(timeString: TimeString, minutes: number): TimeString {
  const [hours, mins, secs] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// LEGACY HELPERS (To be refactored to use TimeString helpers)
// ============================================================================

// Convert Prisma entry to SchedulingEntry
function toSchedulingEntry(entry: any): SchedulingEntry {
  return {
    id: entry.id,
    title: entry.title,
    studioId: entry.studio_id,
    studioName: entry.studios.name,
    categoryId: entry.category_id,
    categoryName: entry.dance_categories.name,
    ageGroupId: entry.age_group_id,
    ageGroupName: entry.age_groups.name,
    entrySizeCategoryId: entry.entry_size_category_id,
    duration: entry.duration || 3, // Default 3 minutes if not set
    warmUpTime: 15, // Default 15 minutes warm-up
    sessionId: entry.session_id,
    performanceTime: entry.performance_time,
    runningOrder: entry.running_order,
    participants: entry.entry_participants.map((p: any) => ({
      dancerId: p.dancer_id,
      dancerName: p.dancer_name,
      dancerAge: p.dancer_age,
    })),
  };
}

// Convert Prisma session to SessionCapacity
function toSessionCapacity(session: any): SessionCapacity {
  const startTime = new Date(session.start_time);
  const endTime = session.end_time ? new Date(session.end_time) : null;

  // Calculate available minutes
  let availableMinutes = 0;
  if (endTime) {
    availableMinutes = getMinutesDifference(startTime, endTime);
  } else {
    // Default to 4 hours if no end time
    availableMinutes = 240;
  }

  return {
    sessionId: session.id,
    sessionName: session.session_name || `Session ${session.session_number}`,
    sessionDate: new Date(session.session_date),
    startTime,
    endTime,
    maxEntries: session.max_entries,
    currentEntryCount: session.entry_count || 0,
    availableMinutes,
  };
}

// Time-slot generation utilities for timeline grid
interface TimeSlot {
  date: string;
  time: string;
  displayTime: string;
  index: number;
  available: boolean;
  routineId?: string;
  blockId?: string;
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

function formatDisplayTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(mins).padStart(2, '0')} ${period}`;
}

function generateTimeSlots(session: any, slotDuration: number = 5): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startTimeStr = session.start_time.toISOString().split('T')[1].substring(0, 8);
  const endTimeStr = session.end_time ? session.end_time.toISOString().split('T')[1].substring(0, 8) : '23:59:59';
  const startMinutes = timeToMinutes(startTimeStr);
  const endMinutes = timeToMinutes(endTimeStr);
  const dateStr = session.session_date.toISOString().split('T')[0];

  for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
    slots.push({
      date: dateStr,
      time: minutesToTime(minutes),
      displayTime: formatDisplayTime(minutes),
      index: slots.length,
      available: true,
    });
  }

  return slots;
}

export const schedulingRouter = router({
  // Get all sessions for a competition
  getSessions: publicProcedure
    .input(z.object({ competitionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const sessions = await prisma.competition_sessions.findMany({
        where: { competition_id: input.competitionId },
        orderBy: [
          { session_date: 'asc' },
          { start_time: 'asc' },
        ],
        include: {
          competition_entries: {
            select: { id: true },
          },
        },
      });

      return sessions.map(session => ({
        ...toSessionCapacity(session),
        currentEntryCount: session.competition_entries.length,
      }));
    }),

  getCompetitionSessions: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const sessions = await prisma.competition_sessions.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: input.tenantId,
        },
        orderBy: [
          { session_date: 'asc' },
          { start_time: 'asc' },
        ],
      });

      return sessions.map(session => ({
        id: session.id,
        competitionId: session.competition_id,
        sessionNumber: session.session_number,
        sessionName: session.session_name || `Session ${session.session_number}`,
        sessionDate: session.session_date,
        startTime: session.start_time,
        endTime: session.end_time,
        maxEntries: session.max_entries,
        entryCount: session.entry_count,
        timeSlots: generateTimeSlots(session),
      }));
    }),

  scheduleRoutineToTimeSlot: publicProcedure
    .input(z.object({
      routineId: z.string().uuid(),
      tenantId: z.string().uuid(),
      sessionId: z.string().uuid(),
      targetDate: z.string(),
      targetTime: z.string(),
    }))
    .mutation(async ({ input }) => {
      const session = await prisma.competition_sessions.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) throw new Error('Session not found');

      const targetMinutes = timeToMinutes(input.targetTime);
      const sessionStartMinutes = timeToMinutes(
        session.start_time.toISOString().split('T')[1].substring(0, 8)
      );
      const displayOrder = Math.floor((targetMinutes - sessionStartMinutes) / 5);

      const updated = await prisma.competition_entries.update({
        where: { id: input.routineId },
        data: {
          session_id: input.sessionId,
          performance_date: new Date(input.targetDate),
          performance_time: timeStringToDateTime(input.targetTime), // Convert TimeString to DateTime
          display_order: displayOrder,
          schedule_zone: null,
        },
      });

      return updated;
    }),

  // Unified scheduling mutation (Rebuild Spec Section 5)
  // Handles 1-600 routines identically with atomic transaction
  schedule: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      date: z.string(), // "2026-04-09"
      routines: z.array(z.object({
        routineId: z.string().uuid(),
        entryNumber: z.number(),
        performanceTime: z.string(), // "08:00:00"
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify tenant context
      if (ctx.tenantId && ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      // Draft state architecture: Save complete final state in one atomic transaction
      // Two-phase approach to avoid unique constraint violations:
      // 1. Clear entry numbers for all routines we're about to schedule
      // 2. Set new entry numbers and times
      const updates = await prisma.$transaction(async (tx) => {
        const routineIds = input.routines.map(r => r.routineId);

        // Phase 1: Clear entry numbers ONLY for this specific date
        // CRITICAL: Only clear the date being saved to preserve other days in multi-day schedules
        // This allows Thursday and Saturday to be saved independently without overwriting each other
        await tx.competition_entries.updateMany({
          where: {
            competition_id: input.competitionId,
            tenant_id: input.tenantId,
            performance_date: new Date(input.date), // Only clear this date
          },
          data: {
            entry_number: null,
            is_scheduled: false,
          },
        });

        // Phase 2: Update all routines with their final entry numbers and performance times
        // Safe to parallelize because Phase 1 already cleared all entry numbers (no unique constraint violations)
        // Parallel updates (Promise.all) for performance - supports 1000+ routines
        const finalUpdates = await Promise.all(
          input.routines.map(({ routineId, entryNumber, performanceTime }) =>
            tx.competition_entries.update({
              where: {
                id: routineId,
                tenant_id: input.tenantId,
              },
              data: {
                performance_date: new Date(input.date),
                performance_time: timeStringToDateTime(performanceTime),
                entry_number: entryNumber,
                is_scheduled: true,
                updated_at: new Date(),
              },
            })
          )
        );

        return finalUpdates;
      }, {
        maxWait: 120000, // 120 seconds max wait to start transaction
        timeout: 120000, // 120 seconds transaction timeout (supports 500+ routines per day)
      });

      // Create schedule version snapshot (CSV-style internal backup)
      // This creates a complete snapshot of the schedule for backup/restore purposes
      // Happens AFTER transaction to ensure data is persisted first

      // Get current max version number for this competition
      const maxVersion = await prisma.schedule_versions.findFirst({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
        },
        orderBy: { version_number: 'desc' },
        select: { version_number: true },
      });

      const nextVersionNumber = (maxVersion?.version_number ?? 0) + 1;

      // Fetch full routine data with related tables for complete snapshot
      const routinesWithDetails = await prisma.competition_entries.findMany({
        where: {
          id: { in: input.routines.map(r => r.routineId) },
          tenant_id: input.tenantId,
        },
        include: {
          studios: { select: { name: true } },
          classifications: { select: { name: true } },
          dance_categories: { select: { name: true } },
          age_groups: { select: { name: true } },
        },
        orderBy: { entry_number: 'asc' },
      });

      // Build snapshot data as JSON array
      const snapshotData = routinesWithDetails.map(routine => ({
        routineId: routine.id,
        entryNumber: routine.entry_number,
        performanceTime: routine.performance_time ? dateTimeToTimeString(routine.performance_time) : null,
        performanceDate: routine.performance_date?.toISOString().split('T')[0] ?? null,
        title: routine.title,
        studioName: routine.studios.name,
        duration: routine.routine_length_minutes,
        classificationName: routine.classifications.name,
        categoryName: routine.dance_categories.name,
        ageGroupName: routine.age_groups.name,
        dancerNames: routine.dancer_names,
        isScheduled: routine.is_scheduled,
      }));

      // Create schedule version snapshot record
      await prisma.schedule_versions.create({
        data: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          version_number: nextVersionNumber,
          status: 'draft', // Internal backup, not sent to studios
          routine_count: routinesWithDetails.length,
          snapshot_data: snapshotData,
        },
      });

      return {
        success: true,
        count: updates.length,
        routines: updates.map(r => ({
          id: r.id,
          entryNumber: r.entry_number,
          performanceTime: r.performance_time ? dateTimeToTimeString(r.performance_time) : null,
          isScheduled: r.is_scheduled,
        })),
      };
    }),

  // Time calculation endpoint (Rebuild Spec Section 6)
  // Returns calculated times WITHOUT saving to database
  // Frontend can preview times, then call schedule() to save
  calculateScheduleTimes: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      date: z.string(), // "2026-04-09"
      routineIds: z.array(z.string().uuid()),
      startTime: z.string(), // "08:00:00"
      startingEntryNumber: z.number().optional(), // Optional, defaults to max+1
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify tenant context
      if (ctx.tenantId && ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      // Fetch routines with durations
      const routines = await prisma.competition_entries.findMany({
        where: {
          id: { in: input.routineIds },
          tenant_id: input.tenantId,
        },
        select: {
          id: true,
          routine_length_minutes: true,
        },
        orderBy: { id: 'asc' }, // Maintain order
      });

      // Get starting entry number if not provided
      let currentEntryNumber: number;
      if (input.startingEntryNumber) {
        currentEntryNumber = input.startingEntryNumber;
      } else {
        const maxEntry = await prisma.competition_entries.findFirst({
          where: {
            competition_id: input.competitionId,
            tenant_id: input.tenantId,
            entry_number: { not: null },
          },
          orderBy: { entry_number: 'desc' },
          select: { entry_number: true },
        });
        currentEntryNumber = maxEntry?.entry_number ? maxEntry.entry_number + 1 : 100;
      }

      // Calculate times sequentially
      let currentTime = input.startTime; // "08:00:00"

      const schedule = input.routineIds.map(routineId => {
        const routine = routines.find(r => r.id === routineId);
        if (!routine) {
          throw new Error(`Routine ${routineId} not found`);
        }

        const result = {
          routineId: routine.id,
          performanceTime: currentTime,
          entryNumber: currentEntryNumber,
        };

        // Increment time for next routine
        const duration = routine.routine_length_minutes || 3;
        currentTime = addMinutesToTimeString(currentTime, duration);
        currentEntryNumber++;

        return result;
      });

      return { schedule };
    }),

  getScheduleByTimeSlots: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      sessionId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      const where: any = {
        competition_id: input.competitionId,
        tenant_id: input.tenantId,
        performance_date: { not: null },
        performance_time: { not: null },
      };

      if (input.sessionId) {
        where.session_id = input.sessionId;
      }

      const routines = await prisma.competition_entries.findMany({
        where,
        include: {
          studios: { select: { id: true, name: true } },
          dance_categories: { select: { name: true } },
          classifications: { select: { name: true } },
          age_groups: { select: { name: true } },
          entry_size_categories: { select: { name: true } },
          entry_participants: {
            select: {
              dancer_id: true,
              dancer_name: true,
              dancer_age: true,
            },
          },
        },
        orderBy: [
          { performance_date: 'asc' },
          { performance_time: 'asc' },
          { display_order: 'asc' },
        ],
      });

      const groupedByDate: Record<string, any[]> = {};

      routines.forEach(routine => {
        if (!routine.performance_date || !routine.performance_time) return;

        const dateKey = routine.performance_date.toISOString().split('T')[0];
        const timeKey = routine.performance_time instanceof Date
          ? routine.performance_time.toISOString().split('T')[1].substring(0, 8)
          : routine.performance_time;

        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }

        groupedByDate[dateKey].push({
          ...routine,
          timeKey,
        });
      });

      return groupedByDate;
    }),

  // Get all entries for a competition with scheduling info
  getEntries: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      includeScheduled: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const where: any = {
        competition_id: input.competitionId,
      };

      if (!input.includeScheduled) {
        where.session_id = null;
      }

      const entries = await prisma.competition_entries.findMany({
        where,
        include: {
          studios: {
            select: { id: true, name: true },
          },
          dance_categories: {
            select: { id: true, name: true },
          },
          age_groups: {
            select: { id: true, name: true },
          },
          entry_size_categories: {
            select: { id: true, name: true },
          },
          entry_participants: {
            select: {
              dancer_id: true,
              dancer_name: true,
              dancer_age: true,
            },
          },
        },
        orderBy: [
          { session_id: 'asc' },
          { running_order: 'asc' },
        ],
      });

      return entries.map(toSchedulingEntry);
    }),

  // Get unscheduled routines for Phase 2 scheduling interface
  getRoutines: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      classificationId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      searchQuery: z.string().optional(),
      viewMode: z.enum(['cd', 'studio', 'judge', 'public']).optional().default('cd'),
      studioId: z.string().uuid().optional(), // Required for studio view
    }))
    .query(async ({ input, ctx }) => {
      console.log('[getRoutines] === START ===');
      console.log('[getRoutines] Input:', JSON.stringify(input, null, 2));
      console.log('[getRoutines] Context tenantId:', ctx.tenantId);
      console.log('[getRoutines] Context userId:', ctx.userId);

      // Verify tenant context matches request
      // SKIP validation for test environment (tester subdomain)
      const isTestEnvironment = input.tenantId === '00000000-0000-0000-0000-000000000003';

      if (!isTestEnvironment && ctx.tenantId !== input.tenantId) {
        console.error('[getRoutines] TENANT ID MISMATCH!', {
          contextTenantId: ctx.tenantId,
          inputTenantId: input.tenantId,
        });
        throw new Error(`Tenant ID mismatch: context=${ctx.tenantId}, input=${input.tenantId}`);
      }

      if (isTestEnvironment) {
        console.log('[getRoutines] Test environment - skipping tenant validation');
      } else {
        console.log('[getRoutines] Tenant ID validation passed');
      }

      const where: any = {
        competition_id: input.competitionId,
        tenant_id: input.tenantId,
        // Return ALL routines (both scheduled and unscheduled)
        // Frontend will separate them into zones based on scheduledTime
      };

      // View mode filtering: Studio directors only see their own routines
      if (input.viewMode === 'studio') {
        if (!input.studioId) {
          throw new Error('Studio ID required for studio view');
        }
        where.studio_id = input.studioId;
      }

      // Optional filters
      if (input.classificationId) {
        where.classification_id = input.classificationId;
      }

      if (input.categoryId) {
        where.category_id = input.categoryId;
      }

      if (input.searchQuery) {
        where.title = {
          contains: input.searchQuery,
          mode: 'insensitive',
        };
      }

      console.log('[getRoutines] WHERE clause:', JSON.stringify(where, null, 2));

      // PERFORMANCE OPTIMIZATION: Fetch routines with studio codes in single query
      // Include reservation data via JOIN instead of separate query
      const routines = await prisma.competition_entries.findMany({
        where,
        select: {
          id: true,
          title: true,
          studio_id: true,
          classification_id: true,
          category_id: true,
          age_group_id: true,
          entry_size_category_id: true,
          routine_age: true, // Final selected age for routine
          schedule_zone: true,
          performance_time: true,
          performance_date: true,
          entry_number: true, // V4: Sequential entry number
          is_scheduled: true, // V4: Scheduled flag (required for isScheduled field)
          routine_length_minutes: true, // V4: Routine duration
          created_at: true,
          has_studio_requests: true, // SD notes flag for blue glow
          scheduling_notes: true, // SD notes text for tooltip
          dancer_names: true, // Array of dancer names in this routine

          studios: {
            select: {
              id: true,
              name: true,
              code: true, // Studio's own 5-digit code (fallback)
              // Get studio code from approved reservation
              reservations: {
                where: {
                  competition_id: input.competitionId,
                  status: 'approved',
                },
                select: {
                  studio_code: true,
                },
                take: 1, // Only need one reservation per studio for this competition
              },
            },
          },
          dance_categories: {
            select: {
              id: true,
              name: true,
            },
          },
          age_groups: {
            select: {
              id: true,
              name: true,
            },
          },
          entry_size_categories: {
            select: {
              id: true,
              name: true,
            },
          },
          classifications: {
            select: {
              id: true,
              name: true,
            },
          },
          // REMOVED entry_participants - not needed for display (6000+ rows for 600 routines!)
          // Participants are fetched separately by detectConflicts when scheduling
        },
        orderBy: [
          { created_at: 'asc' },
        ],
      });

      console.log('[getRoutines] Prisma returned:', routines.length, 'routines');
      console.log('[getRoutines] First routine (if any):', routines[0] ? { id: routines[0].id, title: routines[0].title } : 'NONE');

      // Transform data based on view mode
      return routines.map(routine => {
        // Fallback priority: reservation code > studio code > 'X' (unassigned)
        const studioCode = routine.studios.reservations[0]?.studio_code ||
                          routine.studios.code ||
                          'X';
        const studioName = routine.studios.name;

        // View mode logic:
        // - CD View: Show full names + codes
        // - Judge View: Show codes only (anonymized)
        // - Studio View: Show full names (only their own routines)
        // - Public View: Show full names (when published)

        let displayStudioName = studioName;
        if (input.viewMode === 'judge') {
          // Judge view: Use code only
          displayStudioName = `Studio ${studioCode}`;
        }

        // FIX: Return date and time as STRINGS to avoid tRPC/Prisma serialization issues
        // Don't create Date objects - let frontend handle date construction
        let scheduledDateString: string | null = null;
        let scheduledTimeString: string | null = null;

        if (routine.performance_date && routine.performance_time) {
          // Extract date components (use local getters, not UTC)
          const year = routine.performance_date.getFullYear();
          const month = String(routine.performance_date.getMonth() + 1).padStart(2, '0');
          const day = String(routine.performance_date.getDate()).padStart(2, '0');
          scheduledDateString = `${year}-${month}-${day}`; // YYYY-MM-DD

          // Convert TIME field to TimeString using standardized helper
          scheduledTimeString = dateTimeToTimeString(routine.performance_time);

          // Debug logging for entry #100
          if (routine.entry_number === 100) {
            console.error('[DEBUG #100] Date string:', scheduledDateString);
            console.error('[DEBUG #100] Time string:', scheduledTimeString);
          }
        }

        return {
          id: routine.id,
          title: routine.title,
          studioId: routine.studio_id,
          studioName: displayStudioName,
          studioCode: studioCode,
          classificationId: routine.classification_id,
          classificationName: routine.classifications.name,
          categoryId: routine.category_id,
          categoryName: routine.dance_categories.name,
          ageGroupId: routine.age_group_id,
          ageGroupName: routine.age_groups.name,
          entrySizeId: routine.entry_size_category_id,
          entrySizeName: routine.entry_size_categories.name,
          duration: routine.routine_length_minutes || 3, // Use actual routine length or default 3 min
          routineAge: routine.routine_age, // Final selected age for routine
          participants: [], // PERFORMANCE: Empty array - participants fetched separately by detectConflicts
          isScheduled: routine.is_scheduled === true, // V4: Use actual is_scheduled column (not performance_date)
          scheduleZone: null, // V4: Deprecated zone field
          scheduledDateString: scheduledDateString, // YYYY-MM-DD string (null if not scheduled)
          scheduledTimeString: scheduledTimeString, // HH:MM:SS string (null if not scheduled)
          entryNumber: routine.entry_number, // V4: Sequential entry number
          has_studio_requests: routine.has_studio_requests ?? false, // SD notes flag
          scheduling_notes: routine.scheduling_notes ?? null, // SD notes text
          dancer_names: routine.dancer_names ?? [], // Array of dancer names in this routine
        };
      });
    }),

  // Schedule a routine to specific date + time + entry number (V4 redesign)
  scheduleRoutine: publicProcedure
    .input(z.object({
      routineId: z.string().uuid(),
      tenantId: z.string().uuid(),
      performanceDate: z.string(), // ISO date: "2026-04-11"
      performanceTime: z.string(), // HH:mm:ss format: "08:00:00"
      entryNumber: z.number(),     // Sequential #100, #101...
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[scheduleRoutine] === START (V4) ===');
      console.log('[scheduleRoutine] Input:', JSON.stringify(input, null, 2));

      // Verify tenant context
      if (ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      // FIX: Pass date/time strings directly to Prisma
      // Prisma handles conversion to PostgreSQL DATE and TIME types
      // Converting to Date objects causes timezone issues (date off by 1 day)
      // and corruption (time becomes Unix epoch)

      try {
        // Get the routine to find competition_id
        const routine = await prisma.competition_entries.findUnique({
          where: { id: input.routineId },
          select: { competition_id: true },
        });

        if (!routine) {
          throw new Error('Routine not found');
        }

        // Auto-assign entry number if 0 or not provided
        let finalEntryNumber = input.entryNumber;
        if (!finalEntryNumber || finalEntryNumber === 0) {
          console.log('[scheduleRoutine] Auto-assigning entry number...');

          // Find the highest entry_number for this competition
          const maxEntry = await prisma.competition_entries.findFirst({
            where: {
              competition_id: routine.competition_id,
              tenant_id: input.tenantId,
              entry_number: { not: null },
            },
            orderBy: { entry_number: 'desc' },
            select: { entry_number: true },
          });

          // Start at 100, or increment from highest existing
          finalEntryNumber = maxEntry?.entry_number ? maxEntry.entry_number + 1 : 100;
          console.log('[scheduleRoutine] Assigned entry number:', finalEntryNumber);
        }

        // FIX: Store time as-is (EST) - don't convert to UTC
        // Frontend sends "08:00:00" meaning 8 AM EST
        // Database TIME field has no timezone, represents EST directly
        // Convert time string to DateTime object for Prisma (TIME field requires DateTime type)
        const updated = await prisma.competition_entries.update({
          where: {
            id: input.routineId,
            tenant_id: input.tenantId,
          },
          data: {
            schedule_zone: null, // Clear old zone-based data
            performance_date: new Date(input.performanceDate), // Convert string to Date for UPDATE
            performance_time: new Date(`1970-01-01T${input.performanceTime}`), // Convert time string to DateTime
            entry_number: finalEntryNumber,
            is_scheduled: true,
          },
        });

        console.log('[scheduleRoutine] SUCCESS:', {
          routineId: updated.id,
          entry_number: updated.entry_number,
          performance_date: updated.performance_date,
          performance_time: updated.performance_time,
        });

        return { success: true, routine: updated };
      } catch (error) {
        console.error('[scheduleRoutine] ERROR:', error);
        throw error;
      }
    }),

  // Reset schedule for a specific day (V4 redesign)
  resetScheduleForDay: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      performanceDate: z.string(), // ISO date: "2026-04-11"
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[resetScheduleForDay] === START ===');
      console.log('[resetScheduleForDay] Date:', input.performanceDate);

      if (ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      try {
        const result = await prisma.competition_entries.updateMany({
          where: {
            tenant_id: input.tenantId,
            competition_id: input.competitionId,
            performance_date: new Date(input.performanceDate),
            is_scheduled: true,
          },
          data: {
            performance_date: null,
            performance_time: null,
            entry_number: null,
            schedule_zone: null,
            is_scheduled: false,
          },
        });

        console.log('[resetScheduleForDay] SUCCESS:', result.count, 'routines reset');
        return { success: true, count: result.count };
      } catch (error) {
        console.error('[resetScheduleForDay] ERROR:', error);
        throw error;
      }
    }),

  // Reset schedule for entire competition (V4 redesign)
  resetScheduleForCompetition: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[resetScheduleForCompetition] === START ===');
      console.log('[resetScheduleForCompetition] Competition:', input.competitionId);

      if (ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      try {
        const result = await prisma.competition_entries.updateMany({
          where: {
            tenant_id: input.tenantId,
            competition_id: input.competitionId,
            is_scheduled: true,
          },
          data: {
            performance_date: null,
            performance_time: null,
            entry_number: null,
            schedule_zone: null,
            is_scheduled: false,
          },
        });

        console.log('[resetScheduleForCompetition] SUCCESS:', result.count, 'routines reset');
        return { success: true, count: result.count };
      } catch (error) {
        console.error('[resetScheduleForCompetition] ERROR:', error);
        throw error;
      }
    }),

  // Get next available time slot for a given day (V4 redesign)
  getNextAvailableSlot: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      targetDate: z.string(), // ISO date
      routineDuration: z.number(), // minutes
      startTime: z.string().optional(), // HH:mm:ss - day start time (default 08:00:00)
    }))
    .query(async ({ input, ctx }) => {
      const dayStartTime = input.startTime || '08:00:00';

      // Find last scheduled routine on this date
      const lastRoutine = await prisma.competition_entries.findFirst({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          performance_date: new Date(input.targetDate), // Convert string to Date for WHERE clause
          is_scheduled: true,
        },
        orderBy: {
          entry_number: 'desc',
        },
        select: {
          entry_number: true,
          performance_time: true,
          routine_length_minutes: true,
        },
      });

      if (!lastRoutine) {
        // First routine of the day
        return {
          time: dayStartTime,
          entryNumber: 100,
        };
      }

      // Calculate next time (use UTC to avoid timezone bugs)
      let lastTime: Date;
      if (lastRoutine.performance_time) {
        lastTime = new Date(lastRoutine.performance_time);
      } else {
        const [hours, minutes, seconds] = dayStartTime.split(':').map(Number);
        lastTime = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds || 0));
      }
      const lastDuration = lastRoutine.routine_length_minutes || 3;
      const nextTime = new Date(lastTime.getTime() + lastDuration * 60000);

      return {
        time: nextTime.toTimeString().slice(0, 8), // HH:mm:ss
        entryNumber: (lastRoutine.entry_number || 99) + 1,
      };
    }),

  // Get routines for specific day, chronologically (V4 redesign)
  getRoutinesByDay: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      date: z.string(), // ISO date
    }))
    .query(async ({ input, ctx }) => {
      const entries = await prisma.competition_entries.findMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          performance_date: new Date(input.date), // Convert string to Date for WHERE clause
          is_scheduled: true,
        },
        orderBy: [
          { entry_number: 'asc' },
          { performance_time: 'asc' },
        ],
        include: {
          studios: { select: { id: true, name: true, studio_code: true } },
          dance_categories: { select: { id: true, name: true } },
          age_groups: { select: { id: true, name: true } },
          classifications: { select: { id: true, name: true } },
          entry_size_categories: { select: { id: true, name: true } },
          entry_participants: {
            select: {
              dancer_id: true,
              dancer_name: true,
            },
          },
        },
      });

      // Transform entries to include string-based date/time fields (same as getRoutines)
      return entries.map(entry => {
        // FIX: Return date and time as STRINGS to avoid tRPC/Prisma serialization issues
        let scheduledDateString: string | null = null;
        let scheduledTimeString: string | null = null;

        if (entry.performance_date && entry.performance_time) {
          const year = entry.performance_date.getFullYear();
          const month = String(entry.performance_date.getMonth() + 1).padStart(2, '0');
          const day = String(entry.performance_date.getDate()).padStart(2, '0');
          scheduledDateString = `${year}-${month}-${day}`; // YYYY-MM-DD

          const hours = entry.performance_time.getUTCHours();
          const minutes = entry.performance_time.getUTCMinutes();
          const seconds = entry.performance_time.getUTCSeconds();
          scheduledTimeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; // HH:MM:SS
        }

        return {
          ...entry,
          scheduledDateString,
          scheduledTimeString,
          routineAge: entry.routine_age,
        };
      });
    }),

  // Get Trophy Helper report
  // Shows last routine per overall category to guide award block placement
  getTrophyHelper: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // For test environment, use TEST_TENANT_ID if ctx.tenantId is null
      const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
      const effectiveTenantId = ctx.tenantId || TEST_TENANT_ID;

      if (!effectiveTenantId) {
        throw new Error('Tenant ID is required');
      }

      // Get all scheduled routines
      const scheduledRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: effectiveTenantId,
          schedule_zone: { not: null },
          is_scheduled: true,
        },
        include: {
          classifications: {
            select: { id: true, name: true },
          },
          age_groups: {
            select: { id: true, name: true },
          },
          entry_size_categories: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { performance_date: 'asc' },
          { performance_time: 'asc' },
        ],
      });

      // Group by overall category: CategoryType + AgeGroup + Classification
      const categoryMap = new Map<string, any[]>();

      for (const routine of scheduledRoutines) {
        const categoryKey = `${routine.entry_size_category_id}-${routine.age_group_id}-${routine.classification_id}`;

        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, []);
        }

        categoryMap.get(categoryKey)!.push(routine);
      }

      // Find last routine in each category
      const trophyHelperEntries = [];

      for (const [categoryKey, routines] of categoryMap.entries()) {
        if (routines.length === 0) continue;

        const lastRoutine = routines[routines.length - 1];
        const firstRoutine = routines[0];

        // Count total routines in this category (scheduled + unscheduled)
        const totalRoutinesInCategory = await prisma.competition_entries.count({
          where: {
            competition_id: input.competitionId,
            tenant_id: effectiveTenantId,
            entry_size_category_id: firstRoutine.entry_size_category_id,
            age_group_id: firstRoutine.age_group_id,
            classification_id: firstRoutine.classification_id,
          },
        });

        // Calculate unscheduled count
        const unscheduledCount = totalRoutinesInCategory - routines.length;

        // Only show trophy helper when ALL routines in category are scheduled
        if (unscheduledCount > 0) continue;

        // Format category display name
        const categoryDisplay = `${firstRoutine.entry_size_categories.name} - ${firstRoutine.age_groups.name} - ${firstRoutine.classifications.name}`;

        // Calculate suggested award time (last routine time + 30 minutes)
        const lastTime = lastRoutine.performance_time;
        const suggestedAwardTime = lastTime
          ? new Date(new Date(lastTime).getTime() + 30 * 60 * 1000)
          : null;

        trophyHelperEntries.push({
          overallCategory: categoryKey,
          categoryDisplay,
          lastRoutineId: lastRoutine.id,
          lastRoutineNumber: lastRoutine.display_order || 0,
          lastRoutineTitle: lastRoutine.title,
          lastRoutineTime: lastRoutine.performance_time,
          lastRoutineDate: lastRoutine.performance_date,
          lastRoutineZone: lastRoutine.schedule_zone,
          totalRoutinesInCategory: routines.length,
          suggestedAwardTime,
        });
      }

      // Sort by suggested award time
      trophyHelperEntries.sort((a, b) => {
        if (!a.suggestedAwardTime) return 1;
        if (!b.suggestedAwardTime) return -1;
        return a.suggestedAwardTime.getTime() - b.suggestedAwardTime.getTime();
      });

      return trophyHelperEntries;
    }),

  // Detect conflicts for current schedule
  // Rule: Minimum 6 routines between any two routines featuring the same dancer
  detectConflicts: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new Error('Tenant ID is required');
      }

      const MIN_ROUTINES_BETWEEN = 6;

      // Get all scheduled routines with participants (V4: use performance_date instead of schedule_zone)
      const scheduledRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId,
          performance_date: { not: null }, // V4: Check date instead of zone
          is_scheduled: true,
        },
        include: {
          entry_participants: {
            select: {
              dancer_id: true,
              dancer_name: true,
            },
          },
        },
        orderBy: { entry_number: 'asc' }, // V4: Use entry_number instead of display_order
      });

      const conflicts = [];

      // Build dancer-to-routines map
      const dancerRoutines = new Map<string, typeof scheduledRoutines>();

      for (const routine of scheduledRoutines) {
        for (const participant of routine.entry_participants) {
          if (!dancerRoutines.has(participant.dancer_id)) {
            dancerRoutines.set(participant.dancer_id, []);
          }
          dancerRoutines.get(participant.dancer_id)!.push(routine);
        }
      }

      // Check spacing between routines for each dancer
      for (const [dancerId, routines] of dancerRoutines.entries()) {
        if (routines.length < 2) continue; // No conflicts if dancer is in only 1 routine

        // Sort by entry_number (V4: use entry_number instead of display_order)
        const sortedRoutines = routines.sort((a, b) => (a.entry_number || 0) - (b.entry_number || 0));

        for (let i = 0; i < sortedRoutines.length - 1; i++) {
          const routine1 = sortedRoutines[i];
          const routine2 = sortedRoutines[i + 1];

          const routinesBetween = (routine2.entry_number || 0) - (routine1.entry_number || 0) - 1;

          if (routinesBetween < MIN_ROUTINES_BETWEEN) {
            const dancerName = routine1.entry_participants.find(p => p.dancer_id === dancerId)?.dancer_name || 'Unknown';

            const severity = routinesBetween === 0 ? 'critical' :
                           routinesBetween <= 3 ? 'error' : 'warning';

            conflicts.push({
              dancerId,
              dancerName,
              routine1Id: routine1.id,
              routine1Number: routine1.entry_number, // V4: Use entry_number
              routine1Title: routine1.title,
              routine2Id: routine2.id,
              routine2Number: routine2.entry_number, // V4: Use entry_number
              routine2Title: routine2.title,
              routinesBetween,
              severity,
              message: `${dancerName} has only ${routinesBetween} routine${routinesBetween !== 1 ? 's' : ''} between performances (need ${MIN_ROUTINES_BETWEEN} minimum)`,
            });
          }
        }
      }

      return {
        conflicts,
        summary: {
          total: conflicts.length,
          critical: conflicts.filter(c => c.severity === 'critical').length,
          errors: conflicts.filter(c => c.severity === 'error').length,
          warnings: conflicts.filter(c => c.severity === 'warning').length,
        },
      };
    }),

  // Get conflicts for current schedule (old session-based system - deprecated)
  getConflicts: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      constraints: z.object({
        minCostumeChangeBuffer: z.number().optional(),
        sessionBuffer: z.number().optional(),
        maxEntriesPerSession: z.number().optional(),
        preferGroupByStudio: z.boolean().optional(),
        preferGroupByCategory: z.boolean().optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      const constraints: SchedulingConstraints = {
        ...DEFAULT_CONSTRAINTS,
        ...input.constraints,
      };

      // Get all sessions
      const sessions = await prisma.competition_sessions.findMany({
        where: { competition_id: input.competitionId },
        include: {
          competition_entries: { select: { id: true } },
        },
      });

      // Get all entries
      const entries = await prisma.competition_entries.findMany({
        where: { competition_id: input.competitionId },
        include: {
          studios: { select: { id: true, name: true } },
          dance_categories: { select: { id: true, name: true } },
          age_groups: { select: { id: true, name: true } },
          entry_size_categories: { select: { id: true, name: true } },
          entry_participants: {
            select: {
              dancer_id: true,
              dancer_name: true,
              dancer_age: true,
            },
          },
        },
      });

      const schedulingEntries = entries.map(toSchedulingEntry);
      const sessionCapacities = sessions.map(s => ({
        ...toSessionCapacity(s),
        currentEntryCount: s.competition_entries.length,
      }));

      const conflicts = getAllConflicts(schedulingEntries, sessionCapacities, constraints);

      return { conflicts, total: conflicts.length };
    }),

  // Finalize schedule (lock entry numbers)
  finalizeSchedule: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      userId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Verify no critical conflicts
      const conflictsResponse = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as critical_count
        FROM schedule_conflicts
        WHERE competition_id = ${input.competitionId}::uuid
          AND severity = 'critical'
          AND status = 'active'
      `;

      const criticalCount = conflictsResponse[0]?.critical_count || 0;

      if (criticalCount > 0) {
        throw new Error(`Cannot finalize schedule: ${criticalCount} critical conflict(s) must be resolved first`);
      }

      // Update competition status
      const updated = await prisma.competitions.update({
        where: {
          id: input.competitionId,
          tenant_id: input.tenantId,
        },
        data: {
          schedule_state: 'finalized',
          schedule_finalized_at: new Date(),
          schedule_finalized_by: input.userId,
          schedule_locked: true,
        },
      });

      return { success: true, competition: updated };
    }),

  // Publish schedule (reveal studio names)
  publishSchedule: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      userId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Verify status is finalized
      const competition = await prisma.competitions.findUnique({
        where: {
          id: input.competitionId,
          tenant_id: input.tenantId,
        },
        select: { schedule_state: true },
      });

      if (competition?.schedule_state !== 'finalized') {
        throw new Error('Schedule must be finalized before publishing');
      }

      // Update competition status
      const updated = await prisma.competitions.update({
        where: {
          id: input.competitionId,
          tenant_id: input.tenantId,
        },
        data: {
          schedule_state: 'published',
          schedule_published_at: new Date(),
          schedule_published_by: input.userId,
        },
      });

      return { success: true, competition: updated };
    }),

  // Unlock schedule (finalized -> draft)
  unlockSchedule: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Verify status is finalized (can't unlock published schedules)
      const competition = await prisma.competitions.findUnique({
        where: {
          id: input.competitionId,
          tenant_id: input.tenantId,
        },
        select: { schedule_state: true },
      });

      if (competition?.schedule_state === 'published') {
        throw new Error('Cannot unlock a published schedule');
      }

      // Update competition status
      const updated = await prisma.competitions.update({
        where: {
          id: input.competitionId,
          tenant_id: input.tenantId,
        },
        data: {
          schedule_state: 'draft',
          schedule_locked: false,
          schedule_finalized_at: null,
          schedule_finalized_by: null,
        },
      });

      return { success: true, competition: updated };
    }),

  // Create schedule block (award or break)
  getScheduleBlocks: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      date: z.string().optional(), // YYYY-MM-DD format, if provided only return blocks for that day
    }))
    .query(async ({ input }) => {
      const where: any = {
        competition_id: input.competitionId,
        tenant_id: input.tenantId,
      };

      // Filter by date if provided (parse in local timezone to match saved data)
      if (input.date) {
        const [year, month, day] = input.date.split('-').map(Number);
        const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
        const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

        where.scheduled_time = {
          gte: dayStart,
          lt: dayEnd,
        };
      }

      const blocks = await prisma.schedule_blocks.findMany({
        where,
        orderBy: [
          { schedule_day: 'asc' },
          { sort_order: 'asc' },
        ],
      });

      return blocks;
    }),

  createScheduleBlock: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      blockType: z.enum(['award', 'break']),
      title: z.string(),
      durationMinutes: z.number(),
      scheduledTime: z.date().optional(), // For auto-placement via drag-drop
      sortOrder: z.number().optional(),   // For auto-placement via drag-drop
    }))
    .mutation(async ({ input }) => {
      const block = await prisma.schedule_blocks.create({
        data: {
          competition_id: input.competitionId,
          tenant_id: input.tenantId,
          block_type: input.blockType,
          title: input.title,
          duration_minutes: input.durationMinutes,
          scheduled_time: input.scheduledTime,
          sort_order: input.sortOrder,
        },
      });

      return block;
    }),

  // Place schedule block at position
  placeScheduleBlock: publicProcedure
    .input(z.object({
      blockId: z.string().uuid(),
      targetTime: z.date(),
      displayOrder: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Round targetTime to nearest 5 minutes
      const minutes = input.targetTime.getMinutes();
      const roundedMinutes = Math.round(minutes / 5) * 5;
      const roundedTime = new Date(input.targetTime);
      roundedTime.setMinutes(roundedMinutes);
      roundedTime.setSeconds(0);
      roundedTime.setMilliseconds(0);

      // Extract date-only part for schedule_day (YYYY-MM-DD at midnight)
      const scheduleDay = new Date(roundedTime);
      scheduleDay.setHours(0, 0, 0, 0);

      const updated = await prisma.schedule_blocks.update({
        where: { id: input.blockId },
        data: {
          scheduled_time: roundedTime,
          schedule_day: scheduleDay, // Set the day field for date filtering
          sort_order: input.displayOrder,
          updated_at: new Date(),
        },
      });

      return updated;
    }),

  deleteScheduleBlock: publicProcedure
    .input(z.object({
      blockId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await prisma.schedule_blocks.delete({
        where: { id: input.blockId },
      });

      return { success: true };
    }),

  // Update block position (for drag-and-drop reordering)
  updateBlockPosition: publicProcedure
    .input(z.object({
      blockId: z.string().uuid(),
      scheduledTime: z.string(), // ISO string
      sortOrder: z.number(),
    }))
    .mutation(async ({ input }) => {
      const scheduledTime = new Date(input.scheduledTime);

      // Extract date-only part for schedule_day
      const scheduleDay = new Date(scheduledTime);
      scheduleDay.setHours(0, 0, 0, 0);

      const updated = await prisma.schedule_blocks.update({
        where: { id: input.blockId },
        data: {
          scheduled_time: scheduledTime,
          schedule_day: scheduleDay,
          sort_order: input.sortOrder,
          updated_at: new Date(),
        },
      });

      return updated;
    }),

  // Add studio request/note to routine
  addStudioRequest: publicProcedure
    .input(z.object({
      routineId: z.string().uuid(),
      tenantId: z.string().uuid(),
      content: z.string(),
      authorId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const note = await prisma.routine_notes.create({
        data: {
          entry_id: input.routineId,
          tenant_id: input.tenantId,
          note_type: 'studio_request',
          note_text: input.content,
          created_by: input.authorId,
          is_internal: false, // Studio requests are external
          priority: 'normal',
        },
      });

      // Update has_studio_requests flag
      await prisma.competition_entries.update({
        where: { id: input.routineId },
        data: { has_studio_requests: true },
      });

      return note;
    }),

  // Get studio requests for competition director
  getStudioRequests: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      filters: z.object({
        status: z.enum(['pending', 'completed', 'ignored']).optional(),
        studioId: z.string().uuid().optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      // Query notes directly with joins
      // Note: status filter is ignored since DB uses priority field
      const notes = await prisma.routine_notes.findMany({
        where: {
          tenant_id: input.tenantId,
          note_type: 'studio_request',
          is_internal: false,
          // TODO: Add proper status field to DB or map priority to status
        },
      });

      // Get associated routine details
      const routineIds = notes.map(n => n.entry_id);
      const routines = await prisma.competition_entries.findMany({
        where: {
          id: { in: routineIds },
          competition_id: input.competitionId,
          ...(input.filters?.studioId ? { studio_id: input.filters.studioId } : {}),
        },
        include: {
          studios: {
            select: { id: true, name: true },
          },
        },
      });

      const routineMap = new Map(routines.map(r => [r.id, r]));

      const requests = notes
        .map(note => {
          const routine = routineMap.get(note.entry_id);
          if (!routine) return null;

          // Map priority to status for frontend compatibility
          const priorityToStatus: Record<string, string> = {
            'normal': 'pending',
            'high': 'pending',
            'low': 'completed',
          };

          return {
            ...note,
            routineTitle: routine.title,
            routineId: routine.id,
            studioName: routine.studios.name,
            status: priorityToStatus[note.priority || 'normal'] || 'pending',
          };
        })
        .filter(r => r !== null);

      return requests;
    }),

  // Update studio request status (maps to priority in DB)
  updateRequestStatus: publicProcedure
    .input(z.object({
      noteId: z.string().uuid(),
      status: z.enum(['completed', 'ignored', 'pending']),
    }))
    .mutation(async ({ input }) => {
      // Map frontend status to backend priority for now
      // In future: add a proper status field or use a different mapping
      const priorityMap: Record<string, string> = {
        'completed': 'low',
        'ignored': 'low',
        'pending': 'normal',
      };

      const updated = await prisma.routine_notes.update({
        where: { id: input.noteId },
        data: {
          priority: priorityMap[input.status] || 'normal',
          updated_at: new Date(),
        },
      });

      return updated;
    }),

  // Add CD private note to routine
  addCDNote: publicProcedure
    .input(z.object({
      routineId: z.string().uuid(),
      tenantId: z.string().uuid(),
      content: z.string(),
      authorId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const note = await prisma.routine_notes.create({
        data: {
          entry_id: input.routineId,
          tenant_id: input.tenantId,
          note_type: 'cd_private',
          note_text: input.content,
          created_by: input.authorId,
          is_internal: true, // CD notes are internal
          priority: null,
        },
      });

      return note;
    }),

  // Get CD private notes for competition or specific routine
  getCDNotes: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid().optional(),
      routineId: z.string().uuid().optional(),
      tenantId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Build where clause
      const where: any = {
        tenant_id: input.tenantId,
        note_type: 'cd_private',
      };

      if (input.routineId) {
        where.entry_id = input.routineId;
      }

      const notes = await prisma.routine_notes.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });

      // If competition ID provided, filter by competition
      if (input.competitionId) {
        const routineIds = notes.map(n => n.entry_id);
        const routines = await prisma.competition_entries.findMany({
          where: {
            id: { in: routineIds },
            competition_id: input.competitionId,
          },
          include: {
            studios: {
              select: { id: true, name: true },
            },
          },
        });

        const routineMap = new Map(routines.map(r => [r.id, r]));

        return notes
          .map(note => {
            const routine = routineMap.get(note.entry_id);
            if (!routine) return null;

            return {
              ...note,
              routineTitle: routine.title,
              routineId: routine.id,
              studioName: routine.studios.name,
            };
          })
          .filter(r => r !== null);
      }

      // If no competition ID, just return notes without routine details
      return notes;
    }),

  // Auto-schedule entries to a session
  autoScheduleSession: publicProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      entryIds: z.array(z.string().uuid()),
      constraints: z.object({
        minCostumeChangeBuffer: z.number().optional(),
        sessionBuffer: z.number().optional(),
        maxEntriesPerSession: z.number().optional(),
        preferGroupByStudio: z.boolean().optional(),
        preferGroupByCategory: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const constraints: SchedulingConstraints = {
        ...DEFAULT_CONSTRAINTS,
        ...input.constraints,
      };

      // Get session
      const session = await prisma.competition_sessions.findUnique({
        where: { id: input.sessionId },
        include: {
          competition_entries: { select: { id: true } },
        },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Get entries to schedule
      const entries = await prisma.competition_entries.findMany({
        where: { id: { in: input.entryIds } },
        include: {
          studios: { select: { id: true, name: true } },
          dance_categories: { select: { id: true, name: true } },
          age_groups: { select: { id: true, name: true } },
          entry_size_categories: { select: { id: true, name: true } },
          entry_participants: {
            select: {
              dancer_id: true,
              dancer_name: true,
              dancer_age: true,
            },
          },
        },
      });

      const schedulingEntries = entries.map(toSchedulingEntry);
      const sessionCapacity: SessionCapacity = {
        ...toSessionCapacity(session),
        currentEntryCount: session.competition_entries.length,
      };

      // Auto-schedule
      const scheduledEntries = autoScheduleSession(sessionCapacity, schedulingEntries, constraints);

      // Check if schedule is locked
      const competition = await prisma.competitions.findUnique({
        where: { id: session.competition_id },
        select: { schedule_locked: true },
      });

      if (competition?.schedule_locked) {
        throw new Error('Cannot modify schedule - entry numbers are locked');
      }

      // Get highest entry number for this competition
      const highestEntry = await prisma.competition_entries.findFirst({
        where: {
          competition_id: session.competition_id,
          entry_number: { not: null },
        },
        orderBy: { entry_number: 'desc' },
        select: { entry_number: true },
      });

      let nextEntryNumber = highestEntry?.entry_number ? highestEntry.entry_number + 1 : 100;

      // Update database with entry numbers
      const updates = scheduledEntries.map(entry => {
        const entryNumber = nextEntryNumber++;

        // Extract time from Date object and convert to TIME field format
        // Convert Date → TimeString → DateTime for TIME field
        const timeString = entry.performanceTime ? entry.performanceTime.toTimeString().split(' ')[0] : null;
        const performanceTime = timeString ? timeStringToDateTime(timeString) : null;

        return prisma.competition_entries.update({
          where: { id: entry.id },
          data: {
            session_id: entry.sessionId,
            performance_time: performanceTime,
            running_order: entry.runningOrder,
            entry_number: entryNumber,
            updated_at: new Date(),
          },
        });
      });

      await Promise.all(updates);

      // Update session entry count
      await prisma.competition_sessions.update({
        where: { id: input.sessionId },
        data: {
          entry_count: session.competition_entries.length + scheduledEntries.length,
        },
      });

      return {
        success: true,
        scheduledCount: scheduledEntries.length,
        skippedCount: input.entryIds.length - scheduledEntries.length,
      };
    }),

  // Manually assign entry to session (without auto-scheduling)
  assignEntryToSession: publicProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      sessionId: z.string().uuid().nullable(),
      performanceTime: z.string().optional(),
      runningOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const data: any = {
        session_id: input.sessionId,
        updated_at: new Date(),
      };

      if (input.performanceTime) {
        data.performance_time = new Date(input.performanceTime);
      }

      if (input.runningOrder !== undefined) {
        data.running_order = input.runningOrder;
      }

      const entry = await prisma.competition_entries.update({
        where: { id: input.entryId },
        data,
      });

      // Update session entry count if assigned to session
      if (input.sessionId) {
        const sessionEntries = await prisma.competition_entries.count({
          where: { session_id: input.sessionId },
        });

        await prisma.competition_sessions.update({
          where: { id: input.sessionId },
          data: { entry_count: sessionEntries },
        });
      }

      return entry;
    }),

  // Clear schedule for entries (remove session assignments)
  clearSchedule: publicProcedure
    .input(z.object({
      entryIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ input }) => {
      await prisma.competition_entries.updateMany({
        where: { id: { in: input.entryIds } },
        data: {
          session_id: null,
          performance_time: null,
          running_order: null,
          entry_number: null,
          entry_suffix: null,
          is_late_entry: false,
          updated_at: new Date(),
        },
      });

      return { success: true, clearedCount: input.entryIds.length };
    }),

  // Assign suffix to late entry (e.g., 156a, 156b)
  assignLateSuffix: publicProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      baseEntryNumber: z.number().int().min(100),
      suffix: z.string().regex(/^[a-z]$/), // Single lowercase letter
    }))
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.entryId },
        select: { competition_id: true },
      });

      if (!entry) throw new Error('Entry not found');

      // Check if suffix already exists
      const existing = await prisma.competition_entries.findFirst({
        where: {
          competition_id: entry.competition_id,
          entry_number: input.baseEntryNumber,
          entry_suffix: input.suffix,
        },
      });

      if (existing) {
        throw new Error(`Suffix ${input.baseEntryNumber}${input.suffix} already exists`);
      }

      await prisma.competition_entries.update({
        where: { id: input.entryId },
        data: {
          entry_number: input.baseEntryNumber,
          entry_suffix: input.suffix,
          is_late_entry: true,
          updated_at: new Date(),
        },
      });

      return { success: true, displayNumber: `${input.baseEntryNumber}${input.suffix}` };
    }),

  // Get session statistics
  getSessionStats: publicProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const session = await prisma.competition_sessions.findUnique({
        where: { id: input.sessionId },
        include: {
          competition_entries: {
            include: {
              studios: { select: { name: true } },
              dance_categories: { select: { name: true } },
              age_groups: { select: { name: true } },
              entry_size_categories: { select: { name: true } },
              entry_participants: {
                select: {
                  dancer_id: true,
                  dancer_name: true,
                  dancer_age: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const sessionCapacity = toSessionCapacity(session);
      const entries = session.competition_entries.map(toSchedulingEntry);

      const stats = calculateSessionStats(sessionCapacity, entries);

      // Additional stats
      const studioBreakdown = entries.reduce((acc, entry) => {
        acc[entry.studioName] = (acc[entry.studioName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categoryBreakdown = entries.reduce((acc, entry) => {
        acc[entry.categoryName] = (acc[entry.categoryName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        ...stats,
        session: {
          id: session.id,
          name: session.session_name || `Session ${session.session_number}`,
          date: session.session_date,
          startTime: session.start_time,
          endTime: session.end_time,
        },
        studioBreakdown,
        categoryBreakdown,
      };
    }),

  // Validate entire competition schedule
  validateSchedule: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      constraints: z.object({
        minCostumeChangeBuffer: z.number().optional(),
        sessionBuffer: z.number().optional(),
        maxEntriesPerSession: z.number().optional(),
        preferGroupByStudio: z.boolean().optional(),
        preferGroupByCategory: z.boolean().optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      const constraints: SchedulingConstraints = {
        ...DEFAULT_CONSTRAINTS,
        ...input.constraints,
      };

      // Get all sessions
      const sessions = await prisma.competition_sessions.findMany({
        where: { competition_id: input.competitionId },
        include: {
          competition_entries: { select: { id: true } },
        },
      });

      // Get all entries
      const entries = await prisma.competition_entries.findMany({
        where: { competition_id: input.competitionId },
        include: {
          studios: { select: { id: true, name: true } },
          dance_categories: { select: { id: true, name: true } },
          age_groups: { select: { id: true, name: true } },
          entry_size_categories: { select: { id: true, name: true } },
          entry_participants: {
            select: {
              dancer_id: true,
              dancer_name: true,
              dancer_age: true,
            },
          },
        },
      });

      const schedulingEntries = entries.map(toSchedulingEntry);
      const sessionCapacities = sessions.map(s => ({
        ...toSessionCapacity(s),
        currentEntryCount: s.competition_entries.length,
      }));

      const validation = validateSchedule(schedulingEntries, sessionCapacities, constraints);

      return {
        ...validation,
        stats: {
          totalEntries: entries.length,
          scheduledEntries: entries.filter(e => e.session_id).length,
          unscheduledEntries: entries.filter(e => !e.session_id).length,
          totalSessions: sessions.length,
          errorCount: validation.conflicts.filter(c => c.severity === 'error').length,
          warningCount: validation.conflicts.filter(c => c.severity === 'warning').length,
        },
      };
    }),

  // Export schedule as CSV (RFC 4180 compliant)
  exportScheduleCSV: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      studioId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input }) => {
      const where: any = {
        competition_id: input.competitionId,
        session_id: { not: null }, // Only scheduled entries
      };

      if (input.studioId) {
        where.studio_id = input.studioId;
      }

      // Fetch competition details for filename
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        select: { name: true },
      });

      const entries = await prisma.competition_entries.findMany({
        where,
        include: {
          studios: { select: { name: true } },
          dance_categories: { select: { name: true } },
          age_groups: { select: { name: true } },
          entry_size_categories: { select: { name: true } },
          competition_sessions: {
            select: {
              session_name: true,
              session_number: true,
              session_date: true,
              start_time: true
            },
          },
        },
        orderBy: [
          { session_id: 'asc' },
          { running_order: 'asc' },
        ],
      });

      // RFC 4180 compliant CSV escape function
      const escapeCSV = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Generate CSV with proper headers
      const headers = [
        'Session',
        'Date',
        'Time',
        'Entry Number',
        'Routine Title',
        'Studio',
        'Category',
        'Age Group',
        'Entry Size',
        'Duration (min)',
        'Running Order',
      ];

      const rows = entries.map(entry => {
        const sessionName = entry.competition_sessions?.session_name ||
                           `Session ${entry.competition_sessions?.session_number || 'N/A'}`;
        const sessionDate = entry.competition_sessions?.session_date
          ? new Date(entry.competition_sessions.session_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          : 'N/A';
        const sessionTime = entry.performance_time
          ? new Date(entry.performance_time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'N/A';
        const duration = 3; // Default 3 minutes (duration field is interval type)

        // Format entry number with suffix (e.g., "156" or "156a")
        const entryNumber = entry.entry_number
          ? `${entry.entry_number}${entry.entry_suffix || ''}`
          : '';

        return [
          escapeCSV(sessionName),
          escapeCSV(sessionDate),
          escapeCSV(sessionTime),
          escapeCSV(entryNumber),
          escapeCSV(entry.title),
          escapeCSV(entry.studios.name),
          escapeCSV(entry.dance_categories.name),
          escapeCSV(entry.age_groups.name),
          escapeCSV(entry.entry_size_categories.name),
          escapeCSV(duration),
          escapeCSV(entry.running_order),
        ];
      });

      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.join(',')),
      ].join('\r\n');

      const base64Data = Buffer.from(csvContent, 'utf-8').toString('base64');
      const timestamp = new Date().toISOString().split('T')[0];
      const slug = competition?.name.toLowerCase().replace(/\s+/g, '-') || 'competition';

      return {
        filename: `schedule-${slug}-${timestamp}.csv`,
        data: base64Data,
        mimeType: 'text/csv',
      };
    }),

  // Export schedule as iCal
  exportScheduleICal: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      studioId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input }) => {
      const where: any = {
        competition_id: input.competitionId,
        session_id: { not: null },
      };

      if (input.studioId) {
        where.studio_id = input.studioId;
      }

      // Fetch competition details
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        select: {
          name: true,
          primary_location: true,
          venue_address: true,
        },
      });

      const entries = await prisma.competition_entries.findMany({
        where,
        include: {
          studios: { select: { name: true } },
          dance_categories: { select: { name: true } },
          age_groups: { select: { name: true } },
          entry_size_categories: { select: { name: true } },
          competition_sessions: {
            select: {
              session_name: true,
              session_number: true,
              session_date: true,
              start_time: true,
            },
          },
        },
        orderBy: [
          { session_id: 'asc' },
          { running_order: 'asc' },
        ],
      });

      // Create calendar
      const calendar = icalGenerator({
        name: `${competition?.name || 'Competition'} Schedule`,
        prodId: '//EMPWR//Schedule Export//EN',
        timezone: 'America/Toronto',
      });

      // Add events for each entry
      entries.forEach(entry => {
        const sessionDate = entry.competition_sessions?.session_date
          ? new Date(entry.competition_sessions.session_date)
          : new Date();
        const performanceTime = entry.performance_time
          ? new Date(entry.performance_time)
          : new Date();

        // Combine date and time
        const startDateTime = new Date(
          sessionDate.getFullYear(),
          sessionDate.getMonth(),
          sessionDate.getDate(),
          performanceTime.getHours(),
          performanceTime.getMinutes()
        );

        // Duration is stored as interval, use default 3 minutes
        const duration = 3;
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

        const sessionName = entry.competition_sessions?.session_name ||
                           `Session ${entry.competition_sessions?.session_number || ''}`;
        const location = competition?.primary_location || 'Competition Venue';

        // Format entry number with suffix (e.g., "156" or "156a")
        const entryNumber = entry.entry_number
          ? `${entry.entry_number}${entry.entry_suffix || ''}`
          : 'TBD';

        const event = calendar.createEvent({
          start: startDateTime,
          end: endDateTime,
          summary: `${entry.title} - ${entry.studios.name}`,
          description: [
            `Entry #${entryNumber}`,
            `Studio: ${entry.studios.name}`,
            `Category: ${entry.dance_categories.name}`,
            `Age Group: ${entry.age_groups.name}`,
            `Size: ${entry.entry_size_categories.name}`,
            `Session: ${sessionName}`,
            `Running Order: ${entry.running_order || 'TBD'}`,
          ].join('\n'),
          location,
          sequence: 0,
        });
        // Set UID using method chaining
        event.uid(`${entry.id}@compportal.com`);
      });

      const icalContent = calendar.toString();
      const base64Data = Buffer.from(icalContent, 'utf-8').toString('base64');
      const slug = competition?.name.toLowerCase().replace(/\s+/g, '-') || 'competition';

      return {
        filename: `schedule-${slug}.ics`,
        data: base64Data,
        mimeType: 'text/calendar',
      };
    }),

  // Export schedule as PDF with jsPDF
  // Assign entry numbers to all competition entries (starts at 100)
  assignEntryNumbers: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Get all entries for this competition that don't have numbers yet
      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          entry_number: null,
        },
        orderBy: [
          { session_id: 'asc' },
          { running_order: 'asc' },
          { created_at: 'asc' },
        ],
      });

      if (entries.length === 0) {
        return { success: true, message: 'All entries already have numbers', assignedCount: 0 };
      }

      // Get the highest existing entry number for this competition
      const maxEntry = await prisma.competition_entries.findFirst({
        where: {
          competition_id: input.competitionId,
          entry_number: { not: null },
        },
        orderBy: { entry_number: 'desc' },
      });

      let nextNumber = maxEntry?.entry_number ? maxEntry.entry_number + 1 : 100;

      // Assign numbers sequentially
      const updates = entries.map(entry =>
        prisma.competition_entries.update({
          where: { id: entry.id },
          data: {
            entry_number: nextNumber++,
            updated_at: new Date(),
          },
        })
      );

      await Promise.all(updates);

      return {
        success: true,
        message: `Assigned entry numbers to ${entries.length} entries`,
        assignedCount: entries.length,
        startNumber: maxEntry?.entry_number ? maxEntry.entry_number + 1 : 100,
        endNumber: nextNumber - 1,
      };
    }),

  // Assign late entry suffix (e.g., 156a, 156b)
  assignLateEntrySuffix: publicProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      afterEntryNumber: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Get the entry to update
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.entryId },
      });

      if (!entry) {
        throw new Error('Entry not found');
      }

      // Find existing suffixes for this entry number
      const existingSuffixes = await prisma.competition_entries.findMany({
        where: {
          competition_id: entry.competition_id,
          entry_number: input.afterEntryNumber,
          entry_suffix: { not: null },
        },
        select: { entry_suffix: true },
        orderBy: { entry_suffix: 'desc' },
      });

      // Calculate next suffix letter
      let nextSuffix = 'a';
      if (existingSuffixes.length > 0) {
        const lastSuffix = existingSuffixes[0].entry_suffix || 'a';
        nextSuffix = String.fromCharCode(lastSuffix.charCodeAt(0) + 1);
      }

      // Update entry with suffix
      await prisma.competition_entries.update({
        where: { id: input.entryId },
        data: {
          entry_number: input.afterEntryNumber,
          entry_suffix: nextSuffix,
          is_late_entry: true,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        entryNumber: `${input.afterEntryNumber}${nextSuffix}`,
        suffix: nextSuffix,
      };
    }),


  // Override a scheduling conflict with reason
  overrideConflict: publicProcedure
    .input(z.object({
      conflictId: z.string(), // Format: dancerId-routine1Id-routine2Id
      reason: z.string().min(10, 'Reason must be at least 10 characters'),
      userId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Parse conflict ID
      const [dancerId, routine1Id, routine2Id] = input.conflictId.split('-');

      if (!dancerId || !routine1Id || !routine2Id) {
        throw new Error('Invalid conflict ID format');
      }

      // Check if conflict override already exists
      const existing = await prisma.schedule_conflict_overrides.findFirst({
        where: {
          dancer_id: dancerId,
          routine_1_id: routine1Id,
          routine_2_id: routine2Id,
          tenant_id: input.tenantId,
        },
      });

      if (existing) {
        // Update existing override
        return await prisma.schedule_conflict_overrides.update({
          where: { id: existing.id },
          data: {
            override_reason: input.reason,
            overridden_by_user_id: input.userId,
            overridden_at: new Date(),
          },
        });
      }

      // Create new override
      return await prisma.schedule_conflict_overrides.create({
        data: {
          dancer_id: dancerId,
          routine_1_id: routine1Id,
          routine_2_id: routine2Id,
          override_reason: input.reason,
          overridden_by_user_id: input.userId,
          overridden_at: new Date(),
          tenant_id: input.tenantId,
        },
      });
    }),

  // Get conflict overrides for a competition
  getConflictOverrides: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      return await prisma.schedule_conflict_overrides.findMany({
        where: {
          tenant_id: input.tenantId,
        },
        include: {
          dancers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy: {
          overridden_at: 'desc',
        },
      });
    }),

  // Assign studio codes based on registration order (per-competition)
  assignStudioCodes: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Get all approved reservations for this competition
      const reservations = await prisma.reservations.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: input.tenantId,
          status: 'approved',
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          created_at: 'asc', // Order by reservation submission date
        },
      }) as any[]; // Type assertion until Prisma regenerates

      // Generate codes A, B, C, D...
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const updates = [];

      for (let i = 0; i < reservations.length; i++) {
        const reservation = reservations[i];

        // Generate code (A, B, C... Z, AA, AB...)
        let code = '';
        let num = i;
        while (num >= 0) {
          code = alphabet[num % 26] + code;
          num = Math.floor(num / 26) - 1;
        }

        // Update reservation with per-competition studio code
        if (!reservation.studio_code || reservation.studio_code !== code) {
          await prisma.reservations.update({
            where: { id: reservation.id },
            data: {
              studio_code: code,
            } as any, // Type assertion until Prisma regenerates
          });

          updates.push({
            reservationId: reservation.id,
            studioId: reservation.studios.id,
            studioName: reservation.studios.name,
            code,
          });
        }
      }

      return {
        success: true,
        codesAssigned: updates.length,
        reservations: updates,
      };
    }),

  // Get schedule filtered by view mode
  getViewModeSchedule: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      viewMode: z.enum(['cd', 'studio', 'judge', 'public']),
      studioId: z.string().uuid().optional(), // Required for studio view
    }))
    .query(async ({ input }) => {
      // Base query
      const where: any = {
        competition_id: input.competitionId,
        tenant_id: input.tenantId,
        is_scheduled: true,
      };

      // Studio view - only show their routines
      if (input.viewMode === 'studio') {
        if (!input.studioId) {
          throw new Error('Studio ID required for studio view');
        }
        where.studio_id = input.studioId;
      }

      // Get routines
      const routines = await prisma.competition_entries.findMany({
        where,
        include: {
          studios: {
            select: {
              id: true,
              name: true,
            },
          },
          dance_categories: {
            select: { id: true, name: true },
          },
          classifications: {
            select: { id: true, name: true },
          },
          age_groups: {
            select: { id: true, name: true },
          },
          entry_size_categories: {
            select: { id: true, name: true },
          },
          entry_participants: {
            select: {
              dancer_id: true,
              dancer_name: true,
              dancer_age: true,
            },
          },
        },
        orderBy: [
          { performance_date: 'asc' },
          { performance_time: 'asc' },
          { display_order: 'asc' },
        ],
      });

      // Get per-competition studio codes from reservations
      const reservations = await prisma.reservations.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: input.tenantId,
          status: 'approved',
        },
        select: {
          studio_id: true,
          studio_code: true,
        } as any, // Type assertion until Prisma regenerates
      }) as any[];

      // Create map of studio_id to per-competition studio_code
      const studioCodeMap = new Map(
        reservations.map(r => [r.studio_id, r.studio_code])
      );

      // Check if schedule is published
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        select: { schedule_state: true },
      });

      const isPublished = competition?.schedule_state === 'published';

      // Transform based on view mode
      return routines.map(routine => {
        const studioCode = studioCodeMap.get(routine.studio_id);

        const base = {
          id: routine.id,
          title: routine.title,
          categoryName: routine.dance_categories.name,
          classificationName: routine.classifications.name,
          ageGroupName: routine.age_groups.name,
          sizeCategoryName: routine.entry_size_categories.name,
          performanceDate: routine.performance_date,
          performanceTime: routine.performance_time,
          displayOrder: routine.display_order,
          participants: routine.entry_participants,
        };

        // CD View: Show codes + full names
        if (input.viewMode === 'cd') {
          return {
            ...base,
            studioCode,
            studioName: routine.studios.name,
            showFullName: true,
          };
        }

        // Studio View: Show only their routines with full name
        if (input.viewMode === 'studio') {
          return {
            ...base,
            studioCode,
            studioName: routine.studios.name,
            showFullName: true,
          };
        }

        // Judge View: Show codes only (anonymized)
        if (input.viewMode === 'judge') {
          return {
            ...base,
            studioCode,
            studioName: null, // Hide full name
            showFullName: false,
          };
        }

        // Public View: Show full names if published, codes if not
        if (input.viewMode === 'public') {
          if (isPublished) {
            return {
              ...base,
              studioCode,
              studioName: routine.studios.name,
              showFullName: true,
            };
          } else {
            return {
              ...base,
              studioCode,
              studioName: null,
              showFullName: false,
            };
          }
        }

        return base;
      });
    }),

  // Detect age changes for scheduled routines (converted to query - Session 58)
  detectAgeChanges: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Get all scheduled routines for the competition
      const routines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: input.tenantId,
          is_scheduled: true,
        },
        include: {
          entry_participants: {
            include: {
              dancers: {
                select: {
                  id: true,
                  date_of_birth: true,
                },
              },
            },
          },
        },
      });

      const changedRoutines = [];

      // Check each routine for age changes
      for (const routine of routines) {
        const ageChanges = [];

        for (const participant of routine.entry_participants) {
          // Skip if no birthdate
          if (!participant.dancers.date_of_birth) continue;

          // Compare current age with stored age at scheduling
          const currentAge = participant.dancer_age;
          if (!currentAge) continue;

          // Calculate age from birthdate
          const dob = new Date(participant.dancers.date_of_birth);
          const now = new Date();
          const calculatedAge = now.getFullYear() - dob.getFullYear();

          // Check if age has changed
          if (currentAge !== calculatedAge) {
            ageChanges.push({
              dancerId: participant.dancer_id,
              dancerName: participant.dancer_name,
              oldAge: currentAge,
              newAge: calculatedAge,
              detectedAt: new Date(),
            });
          }
        }

        // Add routine to changed list if age changes detected
        if (ageChanges.length > 0) {
          changedRoutines.push({
            id: routine.id,
            title: routine.title,
            ageChanges,
          });
        }
      }

      return {
        success: true,
        changesDetected: changedRoutines.length,
        routines: changedRoutines,
      };
    }),

  // Check for hotel attrition warning (all Emerald on one day)
  getHotelAttritionWarning: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Get all scheduled Emerald routines
      const emeraldRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: input.tenantId,
          is_scheduled: true,
          classifications: {
            name: {
              in: ['Emerald', 'emerald', 'EMERALD'],
            },
          },
        },
        select: {
          id: true,
          performance_date: true,
          title: true,
        },
      });

      // Count routines per day
      const dayMap = new Map<string, number>();
      for (const routine of emeraldRoutines) {
        if (routine.performance_date) {
          const dateStr = routine.performance_date.toISOString().split('T')[0];
          dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
        }
      }

      // Check if all routines are on a single day
      const totalEmeraldRoutines = emeraldRoutines.length;
      const daysWithRoutines = Array.from(dayMap.entries());

      if (daysWithRoutines.length === 1 && totalEmeraldRoutines > 0) {
        const [singleDay, count] = daysWithRoutines[0];
        return {
          hasWarning: true,
          severity: 'high',
          message: `All ${count} Emerald routines are scheduled on ${singleDay}. Consider spreading across multiple days to reduce hotel attrition risk.`,
          dayDistribution: daysWithRoutines,
          totalEmeraldRoutines,
        };
      }

      return {
        hasWarning: false,
        severity: 'none',
        message: null,
        dayDistribution: daysWithRoutines,
        totalEmeraldRoutines,
      };
    }),

  // Export schedule as PDF
  exportSchedulePDF: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      viewMode: z.enum(['cd', 'judge', 'studio', 'public']).default('cd'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { competitionId, tenantId, viewMode } = input;

      // Fetch competition details
      const competition = await prisma.competitions.findFirst({
        where: {
          id: competitionId,
          tenant_id: tenantId,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      // Get per-competition studio codes from reservations
      const reservations = await prisma.reservations.findMany({
        where: {
          competition_id: competitionId,
          tenant_id: tenantId,
          status: 'approved',
        },
        select: {
          studio_id: true,
          studio_code: true,
        } as any, // Type assertion until Prisma regenerates
      }) as any[];

      // Create map of studio_id to per-competition studio_code
      const studioCodeMap = new Map(
        reservations.map(r => [r.studio_id, r.studio_code])
      );

      // Fetch all routines for the schedule
      const routines = await prisma.competition_entries.findMany({
        where: {
          competition_id: competitionId,
          tenant_id: tenantId,
        },
        include: {
          classifications: true,
          dance_categories: true,
          age_groups: true,
          entry_size_categories: true,
          studios: true,
        },
        orderBy: [
          { created_at: 'asc' },
        ],
      });

      // Return data for client-side PDF generation
      return {
        competition: {
          name: competition.name,
          startDate: competition.competition_start_date,
          endDate: competition.competition_end_date,
        },
        routines: routines.map(r => ({
          id: r.id,
          title: r.title,
          studioName: viewMode === 'judge' ? null : r.studios?.name,
          studioCode: studioCodeMap.get(r.studio_id),
          classification: r.classifications?.name,
          category: r.dance_categories?.name,
          ageGroup: r.age_groups?.name,
          entrySize: r.entry_size_categories?.name,
          duration: 3, // Default duration (Phase 2 will use actual duration field)
          scheduledDay: null, // Phase 2 field
          scheduledTime: null, // Phase 2 field
          zone: null, // Phase 2 field
        })),
      };
    }),

  // Export schedule as Excel
  exportScheduleExcel: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
      viewMode: z.enum(['cd', 'judge', 'studio', 'public']).default('cd'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { competitionId, tenantId, viewMode } = input;

      // Fetch competition details
      const competition = await prisma.competitions.findFirst({
        where: {
          id: competitionId,
          tenant_id: tenantId,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      // Get per-competition studio codes from reservations
      const reservations = await prisma.reservations.findMany({
        where: {
          competition_id: competitionId,
          tenant_id: tenantId,
          status: 'approved',
        },
        select: {
          studio_id: true,
          studio_code: true,
        } as any, // Type assertion until Prisma regenerates
      }) as any[];

      // Create map of studio_id to per-competition studio_code
      const studioCodeMap = new Map(
        reservations.map(r => [r.studio_id, r.studio_code])
      );

      // Fetch all routines for the schedule
      const routines = await prisma.competition_entries.findMany({
        where: {
          competition_id: competitionId,
          tenant_id: tenantId,
        },
        include: {
          classifications: true,
          dance_categories: true,
          age_groups: true,
          entry_size_categories: true,
          studios: true,
        },
        orderBy: [
          { created_at: 'asc' },
        ],
      });

      // Return data for client-side Excel generation
      return {
        competition: {
          name: competition.name,
          startDate: competition.competition_start_date,
          endDate: competition.competition_end_date,
        },
        routines: routines.map(r => ({
          day: null, // Phase 2 field
          session: null, // Phase 2 field
          time: null, // Phase 2 field
          routine: r.title,
          studio: viewMode === 'judge' ? studioCodeMap.get(r.studio_id) : r.studios?.name,
          classification: r.classifications?.name,
          category: r.dance_categories?.name,
          ageGroup: r.age_groups?.name,
          entrySize: r.entry_size_categories?.name,
          duration: 3, // Default duration (Phase 2 will use actual duration field)
        })),
      };
    }),

  // Batch reorder routines for a day (V4 redesign) - single transaction
  batchReorderRoutines: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      date: z.string(), // ISO date: "2026-04-11"
      routines: z.array(z.object({
        routineId: z.string().uuid(),
        entryNumber: z.number(),
        performanceTime: z.string(), // HH:mm:ss format
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[batchReorderRoutines] === START ===');
      console.log('[batchReorderRoutines] Reordering', input.routines.length, 'routines');

      const { tenantId, competitionId, date, routines } = input;

      // Verify tenant context
      if (ctx.tenantId && ctx.tenantId !== tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      try {
        // Use Prisma transaction to update all routines atomically
        const updates = await prisma.$transaction(
          routines.map(({ routineId, entryNumber, performanceTime }) => {
            // Convert TimeString to DateTime for TIME field
            const performanceTimeFormatted = timeStringToDateTime(performanceTime);

            console.log('[batchReorderRoutines] Routine', routineId, ':', performanceTime, '→', performanceTimeFormatted);

            return prisma.competition_entries.update({
              where: {
                id: routineId,
                tenant_id: tenantId,
              },
              data: {
                entry_number: entryNumber,
                performance_time: performanceTimeFormatted,
                updated_at: new Date(),
              },
            });
          })
        );

        console.log('[batchReorderRoutines] SUCCESS: Updated', updates.length, 'routines');

        return { success: true, updatedCount: updates.length };
      } catch (error) {
        console.error('[batchReorderRoutines] ERROR:', error);
        throw error;
      }
    }),

  // Update day start time - recalculates all routine times for that day (V4 redesign)
  updateDayStartTime: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      date: z.string(), // ISO date: "2026-04-11"
      newStartTime: z.string(), // HH:mm:ss format: "08:00:00"
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[updateDayStartTime] === START ===');
      console.log('[updateDayStartTime] Input:', JSON.stringify(input, null, 2));

      const { tenantId, competitionId, date, newStartTime } = input;

      // Verify tenant context
      if (ctx.tenantId && ctx.tenantId !== tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      // Get all scheduled routines for this date, ordered by entry_number
      const routines = await prisma.competition_entries.findMany({
        where: {
          tenant_id: tenantId,
          competition_id: competitionId,
          performance_date: new Date(date),
          is_scheduled: true,
        },
        orderBy: {
          entry_number: 'asc',
        },
        select: {
          id: true,
          entry_number: true,
          routine_length_minutes: true,
        },
      });

      console.log('[updateDayStartTime] Found routines:', routines.length);

      if (routines.length === 0) {
        console.log('[updateDayStartTime] No routines to update');
        return { success: true, updatedCount: 0 };
      }

      // Parse new start time (use UTC to avoid timezone bugs)
      const [hours, minutes, seconds] = newStartTime.split(':').map(Number);
      const baseTime = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds || 0));

      console.log('[updateDayStartTime] Base time:', baseTime.toISOString());

      // Recalculate times sequentially
      let currentTime = baseTime;
      const updates = [];

      for (const routine of routines) {
        const duration = routine.routine_length_minutes || 3; // Default 3 minutes

        // Update this routine's performance_time
        updates.push(
          prisma.competition_entries.update({
            where: { id: routine.id },
            data: {
              performance_time: currentTime,
              updated_at: new Date(),
            },
          })
        );

        console.log('[updateDayStartTime] Routine #' + routine.entry_number, {
          time: currentTime.toTimeString().slice(0, 8),
          duration,
        });

        // Advance time for next routine
        currentTime = new Date(currentTime.getTime() + duration * 60000);
      }

      // Execute all updates
      await Promise.all(updates);

      console.log('[updateDayStartTime] SUCCESS: Updated', updates.length, 'routines');

      return { success: true, updatedCount: updates.length };
    }),

  // Reset schedule for a specific day (Schedule Page Rebuild Phase 4)
  // Unschedule all routines scheduled for the given date
  resetDay: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      date: z.string(), // "2026-04-09"
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify tenant context
      if (ctx.tenantId && ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      const result = await prisma.competition_entries.updateMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          performance_date: new Date(input.date),
          is_scheduled: true,
        },
        data: {
          is_scheduled: false,
          performance_date: null,
          performance_time: null,
          entry_number: null,
          updated_at: new Date(),
        },
      });

      console.log('[resetDay] Unscheduled', result.count, 'routines for', input.date);

      return {
        success: true,
        count: result.count,
      };
    }),

  // Reset schedule for entire competition (Schedule Page Rebuild Phase 4)
  // Unschedule ALL routines in the competition
  resetCompetition: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify tenant context
      if (ctx.tenantId && ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      const result = await prisma.competition_entries.updateMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          // No is_scheduled filter - clear ALL entries including orphaned dates
        },
        data: {
          is_scheduled: false,
          performance_date: null,
          performance_time: null,
          entry_number: null,
          updated_at: new Date(),
        },
      });

      console.log('[resetCompetition] Unscheduled', result.count, 'routines');

      // Also delete all schedule blocks for the competition
      const blocksResult = await prisma.schedule_blocks.deleteMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
        },
      });

      console.log('[resetCompetition] Deleted', blocksResult.count, 'schedule blocks');

      return {
        success: true,
        count: result.count,
        blocksDeleted: blocksResult.count,
      };
    }),

  // Unschedule specific routines
  unscheduleRoutines: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      routineIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify tenant context
      if (ctx.tenantId && ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      const result = await prisma.competition_entries.updateMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          id: { in: input.routineIds },
        },
        data: {
          is_scheduled: false,
          performance_date: null,
          performance_time: null,
          entry_number: null,
          updated_at: new Date(),
        },
      });

      console.log('[unscheduleRoutines] Unscheduled', result.count, 'routines');

      return {
        success: true,
        count: result.count,
      };
    }),

  // ============================================================================
  // SCHEDULE REVIEW WORKFLOW PROCEDURES
  // ============================================================================

  // CD: Send schedule to Studio Directors for review
  sendToStudios: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      feedbackWindowDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[sendToStudios] Sending schedule for review', input);

      // Get current version number or start at 0
      const currentVersion = await prisma.schedule_versions.findFirst({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
        },
        orderBy: { version_number: 'desc' },
      });

      const newVersionNumber = (currentVersion?.version_number ?? -1) + 1;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + input.feedbackWindowDays);

      // Create new version
      const newVersion = await prisma.schedule_versions.create({
        data: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          version_number: newVersionNumber,
          status: 'under_review',
          sent_at: new Date(),
          deadline,
          sent_by_user_id: ctx.userId,
          feedback_window_days: input.feedbackWindowDays,
          routine_count: 0,
          notes_count: 0,
          responding_studios_count: 0,
          total_studios_count: 0,
        },
      });

      // Update statistics
      await prisma.$executeRawUnsafe(
        `SELECT update_version_statistics($1::uuid)`,
        newVersion.id
      );

      // Get list of studios to notify
      const studios = await prisma.studios.findMany({
        where: {
          tenant_id: input.tenantId,
          competition_entries: {
            some: {
              competition_id: input.competitionId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      console.log(`[sendToStudios] Notifying ${studios.length} studios`);

      // TODO: Queue email notifications to studios

      return {
        versionId: newVersion.id,
        versionNumber: newVersionNumber,
        deadline: newVersion.deadline,
        emailsSent: studios.length,
      };
    }),

  // CD: Get current version info
  getCurrentVersion: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const currentVersion = await prisma.schedule_versions.findFirst({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
        },
        orderBy: { version_number: 'desc' },
      });

      if (!currentVersion) {
        return {
          versionNumber: 0,
          status: 'draft' as const,
          deadline: undefined,
          daysRemaining: undefined,
          respondingStudios: 0,
          totalStudios: 0,
          notesCount: 0,
        };
      }

      // Auto-close if deadline passed
      if (currentVersion.status === 'under_review' && currentVersion.deadline && currentVersion.deadline < new Date()) {
        await prisma.schedule_versions.update({
          where: { id: currentVersion.id },
          data: {
            status: 'review_closed',
            closed_at: new Date(),
          },
        });
        currentVersion.status = 'review_closed';
      }

      const daysRemaining = currentVersion.deadline
        ? Math.ceil((currentVersion.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        versionNumber: currentVersion.version_number,
        status: currentVersion.status as 'draft' | 'under_review' | 'review_closed',
        deadline: currentVersion.deadline,
        daysRemaining: daysRemaining && daysRemaining > 0 ? daysRemaining : 0,
        respondingStudios: currentVersion.responding_studios_count ?? 0,
        totalStudios: currentVersion.total_studios_count ?? 0,
        notesCount: currentVersion.notes_count ?? 0,
      };
    }),

  // CD: Get version history
  getVersionHistory: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const versions = await prisma.schedule_versions.findMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
        },
        orderBy: { version_number: 'desc' },
      });

      return versions.map(v => ({
        versionNumber: v.version_number,
        status: v.status,
        sentAt: v.sent_at,
        deadline: v.deadline,
        closedAt: v.closed_at,
        respondingStudios: v.responding_studios_count ?? 0,
        totalStudios: v.total_studios_count ?? 0,
        notesCount: v.notes_count ?? 0,
      }));
    }),

  // CD: Clear a Studio Director's note
  clearStudioNote: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      entryId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await prisma.competition_entries.update({
        where: {
          id: input.entryId,
          tenant_id: input.tenantId,
        },
        data: {
          scheduling_notes: null,
          has_studio_requests: false,
          sd_note_version: null,
        },
      });

      return { success: true };
    }),

  // SD: Get available schedules for a studio
  getAvailableSchedules: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      studioId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Get competitions where studio has entries
      const competitions = await prisma.competitions.findMany({
        where: {
          tenant_id: input.tenantId,
          competition_entries: {
            some: {
              studio_id: input.studioId,
            },
          },
        },
        include: {
          competition_entries: {
            where: {
              studio_id: input.studioId,
            },
            select: {
              id: true,
              has_studio_requests: true,
            },
          },
        },
      });

      const result = await Promise.all(
        competitions.map(async (comp) => {
          // Get latest version for this competition
          const latestVersion = await prisma.schedule_versions.findFirst({
            where: {
              tenant_id: input.tenantId,
              competition_id: comp.id,
              status: { in: ['under_review', 'review_closed'] },
            },
            orderBy: { version_number: 'desc' },
          });

          const routineCount = comp.competition_entries.length;
          const notesCount = comp.competition_entries.filter(e => e.has_studio_requests).length;

          return {
            competitionId: comp.id,
            competitionName: comp.name,
            competitionDates: {
              start: comp.competition_start_date,
              end: comp.competition_end_date,
            },
            hasSchedule: !!latestVersion,
            version: latestVersion ? {
              number: latestVersion.version_number,
              status: latestVersion.status,
              deadline: latestVersion.deadline,
              daysRemaining: latestVersion.deadline
                ? Math.ceil((latestVersion.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : undefined,
            } : undefined,
            routineCount,
            notesCount,
          };
        })
      );

      return result;
    }),

  // SD: Get studio's schedule view
  getStudioSchedule: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      studioId: z.string().uuid(),
      versionNumber: z.number().optional(),
    }))
    .query(async ({ input }) => {
      // Get requested version or latest published
      let version;
      if (input.versionNumber !== undefined) {
        version = await prisma.schedule_versions.findFirst({
          where: {
            tenant_id: input.tenantId,
            competition_id: input.competitionId,
            version_number: input.versionNumber,
          },
        });
      } else {
        version = await prisma.schedule_versions.findFirst({
          where: {
            tenant_id: input.tenantId,
            competition_id: input.competitionId,
            status: { in: ['under_review', 'review_closed'] },
          },
          orderBy: { version_number: 'desc' },
        });
      }

      if (!version) {
        throw new Error('Schedule not available');
      }

      // Auto-close if deadline passed
      if (version.status === 'under_review' && version.deadline && version.deadline < new Date()) {
        await prisma.schedule_versions.update({
          where: { id: version.id },
          data: {
            status: 'review_closed',
            closed_at: new Date(),
          },
        });
        version.status = 'review_closed';
      }

      // Get studio's scheduled routines
      const routines = await prisma.competition_entries.findMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          studio_id: input.studioId,
          performance_time: { not: null },
        },
        orderBy: [
          { performance_date: 'asc' },
          { entry_number: 'asc' },
        ],
        include: {
          dance_categories: true,
          age_groups: true,
          classifications: true,
          entry_size_categories: true,
        },
      });

      // Get schedule blocks
      const blocks = await prisma.schedule_blocks.findMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
          scheduled_time: { not: null },
        },
        orderBy: { scheduled_time: 'asc' },
      });

      // Calculate gaps (simplified - just show time ranges)
      const gaps: any[] = [];
      // TODO: Calculate actual gaps between studio's routines

      const daysRemaining = version.deadline
        ? Math.ceil((version.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : undefined;

      return {
        version: {
          number: version.version_number,
          status: version.status,
          deadline: version.deadline,
          daysRemaining: daysRemaining && daysRemaining > 0 ? daysRemaining : 0,
          canEditNotes: version.status === 'under_review' && (!version.deadline || version.deadline > new Date()),
        },
        routines: routines.map(r => ({
          id: r.id,
          entryNumber: r.entry_number,
          title: r.title,
          scheduledDay: r.performance_date,
          performanceTime: r.performance_time?.toISOString().substring(11, 16) || '',
          classification: r.classifications?.name || '',
          category: r.dance_categories?.name || '',
          ageGroup: r.age_groups?.name || '',
          entrySize: r.entry_size_categories?.name || '',
          duration: r.routine_length_minutes || 3,
          hasNote: r.has_studio_requests || false,
          noteText: r.scheduling_notes,
        })),
        blocks: blocks.map(b => ({
          type: b.block_type as 'award' | 'break',
          scheduledDay: b.schedule_day,
          startTime: b.scheduled_time?.toISOString().substring(11, 16) || '',
          duration: b.duration_minutes,
        })),
        gaps,
      };
    }),

  // SD: Submit or update a studio note
  submitStudioNote: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      entryId: z.string().uuid(),
      noteText: z.string().max(500),
      studioId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      // Verify studio owns this routine
      const routine = await prisma.competition_entries.findFirst({
        where: {
          id: input.entryId,
          tenant_id: input.tenantId,
          studio_id: input.studioId,
        },
      });

      if (!routine) {
        throw new Error('Routine not found or access denied');
      }

      // Get current version
      const currentVersion = await prisma.schedule_versions.findFirst({
        where: {
          tenant_id: input.tenantId,
          competition_id: routine.competition_id,
          status: 'under_review',
        },
        orderBy: { version_number: 'desc' },
      });

      if (!currentVersion) {
        throw new Error('No schedule available for review');
      }

      // Check deadline
      if (currentVersion.deadline && currentVersion.deadline < new Date()) {
        throw new Error('Review period has closed');
      }

      // Update routine with note
      await prisma.competition_entries.update({
        where: { id: input.entryId },
        data: {
          scheduling_notes: input.noteText || null,
          has_studio_requests: !!input.noteText,
          sd_note_version: input.noteText ? currentVersion.version_number : null,
        },
      });

      // Update version statistics
      await prisma.$executeRawUnsafe(
        `SELECT update_version_statistics($1::uuid)`,
        currentVersion.id
      );

      return {
        success: true,
        noteText: input.noteText,
        submittedAt: new Date(),
      };
    }),

  // Get studios with unassigned codes (for modal)
  getUnassignedStudioCodes: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Get all approved reservations for this competition
      const reservations = await prisma.reservations.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: input.tenantId,
          status: 'approved',
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          approved_at: 'asc', // Order by approval time for sequential assignment
        },
      });

      // Separate assigned and unassigned
      const unassigned = reservations.filter(r => !r.studio_code);
      const assigned = reservations.filter(r => r.studio_code);

      return {
        unassignedCount: unassigned.length,
        totalCount: reservations.length,
        unassigned: unassigned.map(r => ({
          reservationId: r.id,
          studioId: r.studio_id,
          studioName: r.studios.name,
          approvedAt: r.approved_at,
        })),
        assigned: assigned.map(r => ({
          studioId: r.studio_id,
          studioName: r.studios.name,
          code: r.studio_code,
        })),
      };
    }),

  // Auto-assign studio codes based on approval order
  autoAssignStudioCodes: publicProcedure
    .input(z.object({
      competitionId: z.string().uuid(),
      tenantId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get all approved reservations ordered by approval time
      const reservations = await prisma.reservations.findMany({
        where: {
          competition_id: input.competitionId,
          tenant_id: input.tenantId,
          status: 'approved',
        },
        include: {
          studios: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          approved_at: 'asc',
        },
      });

      // Helper function to generate sequential letter codes (A-Z, AA-ZZ, AAA...)
      function generateCode(index: number): string {
        let code = '';
        let num = index;

        do {
          code = String.fromCharCode(65 + (num % 26)) + code;
          num = Math.floor(num / 26) - 1;
        } while (num >= 0);

        return code;
      }

      // Assign codes sequentially
      const assignments: Array<{ reservationId: string; studioName: string; code: string }> = [];
      let codeIndex = 0;

      for (const reservation of reservations) {
        // Skip if already has a code
        if (reservation.studio_code) {
          continue;
        }

        const code = generateCode(codeIndex);
        codeIndex++;

        // Update reservation with code
        await prisma.reservations.update({
          where: { id: reservation.id },
          data: { studio_code: code },
        });

        assignments.push({
          reservationId: reservation.id,
          studioName: reservation.studios.name,
          code,
        });
      }

      return {
        success: true,
        assignedCount: assignments.length,
        assignments,
      };
    }),

  // Nuclear reset - Deletes schedule + versions (DESTRUCTIVE)
  // ⚠️ CRITICAL: Only touches schedule-based info, NEVER entries/reservations/dancers
  // Requires explicit confirmation from user
  resetAllDraftsAndVersions: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      competitionId: z.string().uuid(),
      confirmation: z.string(), // Must be "RESET"
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify tenant context
      if (ctx.tenantId && ctx.tenantId !== input.tenantId) {
        throw new Error('Tenant ID mismatch');
      }

      // Verify confirmation
      if (input.confirmation !== 'RESET') {
        throw new Error('Invalid confirmation. Type RESET to confirm.');
      }

      console.log('[resetAllDraftsAndVersions] Starting nuclear reset (DELETE ALL: schedule + versions) for competition', input.competitionId);

      // 1. Delete all schedule versions (DESTRUCTIVE - permanent history loss)
      const versionsResult = await prisma.schedule_versions.deleteMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
        },
      });

      console.log('[resetAllDraftsAndVersions] Deleted', versionsResult.count, 'versions');

      // 2. Unschedule all routines (clears schedule info only, preserves entry data)
      const routinesResult = await prisma.competition_entries.updateMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
        },
        data: {
          is_scheduled: false,
          performance_date: null,
          performance_time: null,
          entry_number: null,
          schedule_zone: null,
        },
      });

      console.log('[resetAllDraftsAndVersions] Unscheduled', routinesResult.count, 'routines');

      // 3. Delete all schedule blocks
      const blocksResult = await prisma.schedule_blocks.deleteMany({
        where: {
          tenant_id: input.tenantId,
          competition_id: input.competitionId,
        },
      });

      console.log('[resetAllDraftsAndVersions] Deleted', blocksResult.count, 'schedule blocks');

      return {
        success: true,
        versionsDeleted: versionsResult.count,
        routinesUnscheduled: routinesResult.count,
        blocksDeleted: blocksResult.count,
      };
    }),

});
