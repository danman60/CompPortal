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
        prodId: '//CompPortal//Schedule Export//EN',
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

      // Fetch competition details
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
              start_time: true,
            },
          },
        },
        orderBy: [
          { session_id: 'asc' },
          { running_order: 'asc' },
        ],
      });

      // Group by session
      type EntryWithRelations = typeof entries[0];
      const sessionGroups = entries.reduce((acc, entry) => {
        const sessionId = entry.session_id || 'unscheduled';
        if (!acc[sessionId]) {
          acc[sessionId] = [];
        }
        acc[sessionId].push(entry);
        return acc;
      }, {} as Record<string, EntryWithRelations[]>);

      // Create PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      let isFirstPage = true;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Title on first page
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`Competition Schedule - ${competition?.name || 'Competition'}`, pageWidth / 2, 15, {
        align: 'center',
      });

      let yPosition = 25;

      // Process each session
      for (const [sessionId, sessionEntries] of Object.entries(sessionGroups)) {
        if (!isFirstPage) {
          doc.addPage();
          yPosition = 15;
        }
        isFirstPage = false;

        const firstEntry = sessionEntries[0];
        const sessionName = firstEntry.competition_sessions?.session_name ||
                           `Session ${firstEntry.competition_sessions?.session_number || ''}`;
        const sessionDate = firstEntry.competition_sessions?.session_date
          ? new Date(firstEntry.competition_sessions.session_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'Date TBD';

        // Session header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sessionName}`, 14, yPosition);
        yPosition += 6;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(sessionDate, 14, yPosition);
        yPosition += 8;

        // Table data
        const tableData = sessionEntries.map(entry => {
          // Format entry number with suffix (e.g., "156" or "156a")
          const entryNumber = entry.entry_number
            ? `${entry.entry_number}${entry.entry_suffix || ''}`
            : '';

          return [
            entryNumber,
            entry.title || '',
            entry.studios.name || '',
            entry.dance_categories.name || '',
            entry.age_groups.name || '',
            entry.performance_time
              ? new Date(entry.performance_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'TBD',
            entry.running_order?.toString() || '',
          ];
        });

        autoTable(doc, {
          head: [['Entry #', 'Routine Name', 'Studio', 'Category', 'Age Group', 'Time', 'Order']],
          body: tableData,
          startY: yPosition,
          theme: 'striped',
          headStyles: {
            fillColor: [66, 66, 66],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          columnStyles: {
            0: { cellWidth: 15 },  // Entry #
            1: { cellWidth: 50 },  // Routine Name
            2: { cellWidth: 45 },  // Studio
            3: { cellWidth: 35 },  // Category
            4: { cellWidth: 30 },  // Age Group
            5: { cellWidth: 20 },  // Time
            6: { cellWidth: 15 },  // Order
          },
          margin: { top: yPosition, left: 14, right: 14 },
          didDrawPage: (data) => {
            // Footer with page numbers
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
              `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
              14,
              pageHeight - 10
            );
            doc.text(
              `Page ${doc.getCurrentPageInfo().pageNumber}`,
              pageWidth - 14,
              pageHeight - 10,
              { align: 'right' }
            );
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }

      // Get PDF as buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      const base64Data = pdfBuffer.toString('base64');
      const timestamp = new Date().toISOString().split('T')[0];
      const slug = competition?.name.toLowerCase().replace(/\s+/g, '-') || 'competition';

      return {
        filename: `schedule-${slug}-${timestamp}.pdf`,
        data: base64Data,
        mimeType: 'application/pdf',
      };
    }),
});
