import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';

/**
 * Music Notification router for CD-focused music status monitoring and reminders
 * Implements Phase 5 of MP3 Bulk Upload PRD
 */
export const musicNotificationRouter = router({
  /**
   * Get comprehensive music status summary for a competition
   * Used by CD dashboard to see all studios with missing music
   */
  getMusicStatusSummary: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const supabase = await createServerSupabaseClient();

      // Get competition with tenant info
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        select: {
          id: true,
          name: true,
          year: true,
          competition_start_date: true,
          registration_closes: true,
          tenant_id: true,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      // Get all non-cancelled entries for this competition
      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          status: { not: 'cancelled' },
        },
        select: {
          id: true,
          title: true,
          entry_number: true,
          music_file_url: true,
          studio_id: true,
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          dance_categories: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ studio_id: 'asc' }, { entry_number: 'asc' }],
      });

      // Calculate stats
      const totalEntries = entries.length;
      const withMusic = entries.filter(e => e.music_file_url).length;
      const missingMusic = totalEntries - withMusic;

      // Group missing entries by studio
      const missingByStudio = new Map<string, {
        studioId: string;
        studioName: string;
        studioEmail: string | null;
        entries: typeof entries;
        lastReminderAt: Date | null;
      }>();

      for (const entry of entries.filter(e => !e.music_file_url)) {
        const studioId = entry.studio_id;
        if (!studioId) continue;

        if (!missingByStudio.has(studioId)) {
          missingByStudio.set(studioId, {
            studioId,
            studioName: entry.studios?.name || 'Unknown Studio',
            studioEmail: entry.studios?.email || null,
            entries: [],
            lastReminderAt: null,
          });
        }
        missingByStudio.get(studioId)!.entries.push(entry);
      }

      // Get last reminder for each studio
      const studioIds = Array.from(missingByStudio.keys());
      if (studioIds.length > 0) {
        const { data: reminderLogs } = await supabase
          .from('mp3_reminder_log')
          .select('studio_id, sent_at')
          .eq('competition_id', input.competitionId)
          .in('studio_id', studioIds)
          .order('sent_at', { ascending: false });

        if (reminderLogs) {
          const latestByStudio = new Map<string, Date>();
          for (const log of reminderLogs) {
            if (!latestByStudio.has(log.studio_id)) {
              latestByStudio.set(log.studio_id, new Date(log.sent_at));
            }
          }
          for (const [studioId, date] of latestByStudio) {
            const studio = missingByStudio.get(studioId);
            if (studio) {
              studio.lastReminderAt = date;
            }
          }
        }
      }

      // Calculate days until deadline
      let daysUntilDeadline: number | null = null;
      if (competition.registration_closes) {
        const deadline = new Date(competition.registration_closes);
        const now = new Date();
        daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        competition: {
          id: competition.id,
          name: competition.name,
          year: competition.year,
          entryDeadline: competition.registration_closes,
          daysUntilDeadline,
        },
        stats: {
          totalEntries,
          withMusic,
          missingMusic,
          percentComplete: totalEntries > 0 ? Math.round((withMusic / totalEntries) * 100) : 100,
        },
        studiosWithMissing: Array.from(missingByStudio.values()).map(studio => ({
          studioId: studio.studioId,
          studioName: studio.studioName,
          studioEmail: studio.studioEmail,
          missingCount: studio.entries.length,
          entryNumbers: studio.entries.map(e => e.entry_number).filter(Boolean) as number[],
          entries: studio.entries.map(e => ({
            id: e.id,
            title: e.title,
            entryNumber: e.entry_number,
            category: e.dance_categories?.name || 'Unknown',
          })),
          lastReminderAt: studio.lastReminderAt,
        })),
        reminderSettings: null, // TODO: Add when competition_settings table is available
      };
    }),

  /**
   * Get reminder history for a competition
   */
  getReminderHistory: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
        studioId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const supabase = await createServerSupabaseClient();

      let query = supabase
        .from('mp3_reminder_log')
        .select(`
          id,
          notification_type,
          entries_missing,
          sent_at,
          email_id,
          opened_at,
          clicked_at,
          studio_id,
          user_id
        `)
        .eq('competition_id', input.competitionId)
        .order('sent_at', { ascending: false })
        .limit(input.limit);

      if (input.studioId) {
        query = query.eq('studio_id', input.studioId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch reminder history: ${error.message}`);
      }

      // Get studio names for the logs
      const studioIds = [...new Set(data?.map(d => d.studio_id).filter(Boolean))];
      const studios = studioIds.length > 0
        ? await prisma.studios.findMany({
            where: { id: { in: studioIds as string[] } },
            select: { id: true, name: true },
          })
        : [];

      const studioMap = new Map(studios.map(s => [s.id, s.name]));

      return {
        history: (data || []).map(log => ({
          id: log.id,
          notificationType: log.notification_type,
          entriesMissing: log.entries_missing,
          sentAt: log.sent_at,
          studioId: log.studio_id,
          studioName: log.studio_id ? studioMap.get(log.studio_id) || 'Unknown' : null,
          emailOpened: !!log.opened_at,
          emailClicked: !!log.clicked_at,
        })),
      };
    }),

  /**
   * Mark an entry as exempt from music requirement
   * TODO: Implement when music_exempt field is added to competition_entries schema
   */
  markEntryExempt: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        exempt: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement when music_exempt field is added to schema
      // For now, just acknowledge the request
      return {
        success: true,
        entry: {
          id: input.entryId,
          title: 'Entry',
          music_exempt: input.exempt,
          music_exempt_reason: input.exempt ? (input.reason || 'Marked exempt by CD') : null,
        },
        message: 'Music exempt feature not yet available (schema field pending)',
      };
    }),

  /**
   * Log a reminder that was sent (for tracking purposes)
   * Note: Actual email sending is done through the email API route
   */
  logReminderSent: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
        studioId: z.string().uuid().optional(),
        notificationType: z.enum([
          'seven_day_warning',
          'forty_eight_hour_warning',
          'twenty_four_hour_warning',
          'post_deadline_report',
          'manual_reminder',
          'bulk_reminder',
        ]),
        entriesMissing: z.number(),
        emailId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = await createServerSupabaseClient();

      // Get tenant_id from competition
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        select: { tenant_id: true },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const { data, error } = await supabase
        .from('mp3_reminder_log')
        .insert({
          competition_id: input.competitionId,
          studio_id: input.studioId || null,
          notification_type: input.notificationType,
          entries_missing: input.entriesMissing,
          email_id: input.emailId || null,
          tenant_id: competition.tenant_id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to log reminder: ${error.message}`);
      }

      return {
        success: true,
        logId: data.id,
      };
    }),

  /**
   * Update reminder settings for a competition
   * NOTE: competition_settings table exists for global config (routine types, age divisions, etc.)
   * but reminder settings need per-competition storage.
   * Options: 1) Add JSONB field to competitions table, 2) Create competition_notification_settings table
   */
  updateReminderSettings: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
        settings: z.object({
          enabled: z.boolean(),
          sevenDayReminder: z.boolean().optional(),
          fortyEightHourReminder: z.boolean().optional(),
          twentyFourHourReminder: z.boolean().optional(),
          postDeadlineReport: z.boolean().optional(),
          customReminderDays: z.array(z.number()).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement when competition_settings table is available
      // For now, just return success with the settings (not persisted)
      return {
        success: true,
        settings: input.settings,
        message: 'Settings acknowledged (not persisted - competition_settings table not yet available)',
      };
    }),

  /**
   * Get entries missing music for export (CSV/PDF)
   */
  getEntriesMissingMusicForExport: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          status: { not: 'cancelled' },
          music_file_url: null,
          // TODO: Add music_exempt filter when field is added to schema
        },
        select: {
          entry_number: true,
          title: true,
          studios: {
            select: {
              name: true,
              email: true,
            },
          },
          dance_categories: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ entry_number: 'asc' }],
      });

      return {
        entries: entries.map(e => ({
          entryNumber: e.entry_number,
          title: e.title,
          studioName: e.studios?.name || 'Unknown',
          studioEmail: e.studios?.email || '',
          category: e.dance_categories?.name || 'Unknown',
        })),
      };
    }),
});
