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

  // Get conflicts for current schedule
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

      // Update database
      const updates = scheduledEntries.map(entry =>
        prisma.competition_entries.update({
          where: { id: entry.id },
          data: {
            session_id: entry.sessionId,
            performance_time: entry.performanceTime,
            running_order: entry.runningOrder,
            updated_at: new Date(),
          },
        })
      );

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
          updated_at: new Date(),
        },
      });

      return { success: true, clearedCount: input.entryIds.length };
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

  // Export schedule as CSV
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

      const entries = await prisma.competition_entries.findMany({
        where,
        include: {
          studios: { select: { name: true } },
          dance_categories: { select: { name: true } },
          competition_sessions: {
            select: { session_date: true, start_time: true },
          },
        },
        orderBy: [
          { session_id: 'asc' },
          { running_order: 'asc' },
        ],
      });

      // Generate CSV
      const headers = 'Entry Number,Studio,Category,Session Date,Session Time,Running Order,Duration (min)\n';
      const rows = entries.map(entry => {
        const sessionDate = entry.competition_sessions?.session_date
          ? new Date(entry.competition_sessions.session_date).toLocaleDateString()
          : 'N/A';
        const sessionTime = entry.performance_time
          ? new Date(entry.performance_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : 'N/A';
        // Duration is stored as interval, use default 3 minutes if not available
        const duration = 3;

        return [
          entry.entry_number || '',
          `"${entry.studios.name}"`,
          `"${entry.dance_categories.name}"`,
          sessionDate,
          sessionTime,
          entry.running_order || '',
          duration,
        ].join(',');
      }).join('\n');

      const csvContent = headers + rows;
      const base64Data = Buffer.from(csvContent, 'utf-8').toString('base64');

      return {
        filename: `schedule-${input.competitionId}.csv`,
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

      const entries = await prisma.competition_entries.findMany({
        where,
        include: {
          studios: { select: { name: true } },
          dance_categories: { select: { name: true } },
          competition_sessions: {
            select: { session_date: true, start_time: true },
          },
        },
        orderBy: [
          { session_id: 'asc' },
          { running_order: 'asc' },
        ],
      });

      // Generate iCal format
      const icalHeader = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CompPortal//Schedule Export//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
      ].join('\r\n');

      const icalFooter = 'END:VCALENDAR';

      const events = entries.map(entry => {
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
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

        const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        return [
          'BEGIN:VEVENT',
          `UID:${entry.id}@compportal`,
          `DTSTAMP:${formatDate(new Date())}`,
          `DTSTART:${formatDate(startDateTime)}`,
          `DTEND:${formatDate(endDateTime)}`,
          `SUMMARY:Entry #${entry.entry_number} - ${entry.title}`,
          `DESCRIPTION:Studio: ${entry.studios.name}\\nCategory: ${entry.dance_categories.name}`,
          `LOCATION:Competition Venue`,
          'END:VEVENT',
        ].join('\r\n');
      }).join('\r\n');

      const icalContent = [icalHeader, events, icalFooter].join('\r\n');
      const base64Data = Buffer.from(icalContent, 'utf-8').toString('base64');

      return {
        filename: `schedule-${input.competitionId}.ics`,
        data: base64Data,
        mimeType: 'text/calendar',
      };
    }),

  // Export schedule as PDF (simple text-based)
  exportSchedulePDF: publicProcedure
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

      const entries = await prisma.competition_entries.findMany({
        where,
        include: {
          studios: { select: { name: true } },
          dance_categories: { select: { name: true } },
          competition_sessions: {
            select: { session_date: true, start_time: true, session_name: true },
          },
        },
        orderBy: [
          { session_id: 'asc' },
          { running_order: 'asc' },
        ],
      });

      // Group by session
      const sessionGroups = entries.reduce((acc, entry) => {
        const sessionId = entry.session_id || 'unscheduled';
        if (!acc[sessionId]) {
          acc[sessionId] = [];
        }
        acc[sessionId].push(entry);
        return acc;
      }, {} as Record<string, typeof entries>);

      // Generate simple text-based PDF content (can be enhanced with actual PDF library)
      let pdfContent = 'COMPETITION SCHEDULE\n\n';
      pdfContent += '='.repeat(80) + '\n\n';

      for (const [sessionId, sessionEntries] of Object.entries(sessionGroups)) {
        const firstEntry = sessionEntries[0];
        const sessionName = firstEntry.competition_sessions?.session_name || 'Session';
        const sessionDate = firstEntry.competition_sessions?.session_date
          ? new Date(firstEntry.competition_sessions.session_date).toLocaleDateString()
          : 'N/A';

        pdfContent += `${sessionName} - ${sessionDate}\n`;
        pdfContent += '-'.repeat(80) + '\n';
        pdfContent += 'Entry #  Studio                    Category                Time      Order\n';
        pdfContent += '-'.repeat(80) + '\n';

        sessionEntries.forEach(entry => {
          const entryNum = String(entry.entry_number || '').padEnd(8);
          const studio = entry.studios.name.substring(0, 24).padEnd(25);
          const category = entry.dance_categories.name.substring(0, 23).padEnd(24);
          const time = entry.performance_time
            ? new Date(entry.performance_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : 'N/A'.padEnd(9);
          const order = String(entry.running_order || '').padEnd(5);

          pdfContent += `${entryNum} ${studio} ${category} ${time} ${order}\n`;
        });

        pdfContent += '\n';
      }

      const base64Data = Buffer.from(pdfContent, 'utf-8').toString('base64');

      return {
        filename: `schedule-${input.competitionId}.txt`,
        data: base64Data,
        mimeType: 'text/plain',
      };
    }),
});
