import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-server-client';

// Cache for signed URLs (1 hour expiry)
const urlCache = new Map<string, { url: string; expiry: number }>();
const URL_CACHE_TTL = 55 * 60 * 1000; // 55 minutes (before 1hr expiry)

/**
 * Music tracking router for monitoring music uploads and sending reminders
 */
export const musicRouter = router({
  /**
   * Get all routines missing music grouped by competition and studio
   */
  getMissingMusicByCompetition: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: any = {
        music_file_url: null,
        status: { not: 'cancelled' },
      };

      if (input.competitionId) {
        where.competition_id = input.competitionId;
      }

      // Get all routines without music
      const routinesWithoutMusic = await prisma.competition_entries.findMany({
        where,
        select: {
          id: true,
          title: true,
          entry_number: true,
          competition_id: true,
          studio_id: true,
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
              code: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
            },
          },
          dance_categories: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { competition_id: 'asc' },
          { studio_id: 'asc' },
          { entry_number: 'asc' },
        ],
      });

      // Group by competition and studio
      const grouped: Record<
        string,
        {
          competition: {
            id: string;
            name: string;
            year: number;
            startDate: Date | null;
            daysUntil: number | null;
          };
          studios: Record<
            string,
            {
              studio: {
                id: string;
                name: string;
                email: string | null;
                code: string | null;
              };
              routines: Array<{
                id: string;
                title: string;
                entryNumber: number | null;
                category: string | null;
              }>;
              lastReminderSent: Date | null;
            }
          >;
        }
      > = {};

      for (const entry of routinesWithoutMusic) {
        const compId = entry.competition_id;
        const studioId = entry.studio_id;

        // Initialize competition group
        if (!grouped[compId]) {
          const startDate = entry.competitions.competition_start_date;
          let daysUntil: number | null = null;

          if (startDate) {
            const today = new Date();
            const start = new Date(startDate);
            const diffTime = start.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysUntil = diffDays > 0 ? diffDays : null;
          }

          grouped[compId] = {
            competition: {
              id: entry.competitions.id,
              name: entry.competitions.name,
              year: entry.competitions.year,
              startDate,
              daysUntil,
            },
            studios: {},
          };
        }

        // Initialize studio group
        if (!grouped[compId].studios[studioId]) {
          // Get last reminder sent for this studio/competition
          const lastReminder = await prisma.email_logs.findFirst({
            where: {
              template_type: 'missing-music',
              studio_id: studioId,
              competition_id: compId,
              success: true,
            },
            orderBy: {
              sent_at: 'desc',
            },
            select: {
              sent_at: true,
            },
          });

          grouped[compId].studios[studioId] = {
            studio: {
              id: entry.studios.id,
              name: entry.studios.name,
              email: entry.studios.email,
              code: entry.studios.code,
            },
            routines: [],
            lastReminderSent: lastReminder?.sent_at || null,
          };
        }

        // Add routine to studio group
        grouped[compId].studios[studioId].routines.push({
          id: entry.id,
          title: entry.title,
          entryNumber: entry.entry_number,
          category: entry.dance_categories?.name || null,
        });
      }

      return grouped;
    }),

  /**
   * Get statistics summary for music tracking
   */
  getMusicStats: publicProcedure.query(async () => {
    const [totalRoutines, routinesWithMusic, routinesWithoutMusic] = await Promise.all([
      prisma.competition_entries.count({
        where: {
          status: { not: 'cancelled' },
        },
      }),
      prisma.competition_entries.count({
        where: {
          status: { not: 'cancelled' },
          music_file_url: { not: null },
        },
      }),
      prisma.competition_entries.count({
        where: {
          status: { not: 'cancelled' },
          music_file_url: null,
        },
      }),
    ]);

    const uploadRate = totalRoutines > 0 ? (routinesWithMusic / totalRoutines) * 100 : 0;

    return {
      totalRoutines,
      routinesWithMusic,
      routinesWithoutMusic,
      uploadRate,
    };
  }),

  /**
   * Send missing music reminder to a specific studio for a competition
   */
  sendMissingMusicReminder: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
        competitionId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const [studio, competition, entriesWithoutMusic] = await Promise.all([
        prisma.studios.findUnique({
          where: { id: input.studioId },
          select: {
            name: true,
            email: true,
            tenants: { select: { subdomain: true, branding: true } },
          },
        }),
        prisma.competitions.findUnique({
          where: { id: input.competitionId },
          select: {
            name: true,
            year: true,
            competition_start_date: true,
          },
        }),
        prisma.competition_entries.findMany({
          where: {
            studio_id: input.studioId,
            competition_id: input.competitionId,
            status: { not: 'cancelled' },
            music_file_url: null,
          },
          select: {
            title: true,
            entry_number: true,
            dance_categories: {
              select: { name: true },
            },
          },
        }),
      ]);

      if (!studio || !competition) {
        throw new Error('Studio or competition not found');
      }

      if (!studio.email) {
        throw new Error('Studio email not found');
      }

      if (entriesWithoutMusic.length === 0) {
        return {
          success: false,
          message: 'No routines missing music for this studio',
        };
      }

      // Calculate days until competition
      let daysUntilCompetition: number | undefined;
      if (competition.competition_start_date) {
        const startDate = new Date(competition.competition_start_date);
        const today = new Date();
        const diffTime = startDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysUntilCompetition = diffDays > 0 ? diffDays : undefined;
      }

      // Import email functions
      const {
        renderMissingMusicReminder,
        getEmailSubject,
      } = await import('@/lib/email-templates');
      const { sendEmail } = await import('@/lib/email');

      const portalUrl = `https://${studio.tenants.subdomain}.compsync.net`;
      const branding = studio.tenants?.branding as { primaryColor?: string; secondaryColor?: string } | null;
      const data = {
        studioName: studio.name,
        competitionName: competition.name,
        competitionYear: competition.year,
        routinesWithoutMusic: entriesWithoutMusic.map((entry) => ({
          title: entry.title,
          entryNumber: entry.entry_number || undefined,
          category: entry.dance_categories?.name || 'N/A',
        })),
        portalUrl,
        daysUntilCompetition,
        tenantBranding: branding || undefined,
      };

      const html = await renderMissingMusicReminder(data);
      const subject = getEmailSubject('missing-music', data);

      const result = await sendEmail({
        to: studio.email,
        subject,
        html,
        templateType: 'missing-music',
        studioId: input.studioId,
        competitionId: input.competitionId,
      });

      return result;
    }),

  /**
   * Send missing music reminders to all studios for a competition
   */
  sendBulkMissingMusicReminders: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      // Get all studios with missing music for this competition
      const studiosWithMissingMusic = await prisma.studios.findMany({
        where: {
          competition_entries: {
            some: {
              competition_id: input.competitionId,
              music_file_url: null,
              status: { not: 'cancelled' },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          tenants: { select: { subdomain: true, branding: true } },
        },
      });

      const results: Array<{
        studioId: string;
        studioName: string;
        success: boolean;
        error?: string;
      }> = [];

      // Send reminder to each studio
      for (const studio of studiosWithMissingMusic) {
        if (!studio.email) {
          results.push({
            studioId: studio.id,
            studioName: studio.name,
            success: false,
            error: 'No email address',
          });
          continue;
        }

        try {
          // Get competition details and missing entries for this studio
          const [competition, entriesWithoutMusic] = await Promise.all([
            prisma.competitions.findUnique({
              where: { id: input.competitionId },
              select: {
                name: true,
                year: true,
                competition_start_date: true,
              },
            }),
            prisma.competition_entries.findMany({
              where: {
                studio_id: studio.id,
                competition_id: input.competitionId,
                status: { not: 'cancelled' },
                music_file_url: null,
              },
              select: {
                title: true,
                entry_number: true,
                dance_categories: {
                  select: { name: true },
                },
              },
            }),
          ]);

          if (!competition || entriesWithoutMusic.length === 0) {
            results.push({
              studioId: studio.id,
              studioName: studio.name,
              success: false,
              error: 'No missing music entries',
            });
            continue;
          }

          // Calculate days until competition
          let daysUntilCompetition: number | undefined;
          if (competition.competition_start_date) {
            const startDate = new Date(competition.competition_start_date);
            const today = new Date();
            const diffTime = startDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysUntilCompetition = diffDays > 0 ? diffDays : undefined;
          }

          // Import email functions
          const {
            renderMissingMusicReminder,
            getEmailSubject,
          } = await import('@/lib/email-templates');
          const { sendEmail } = await import('@/lib/email');

          const portalUrl = `https://${studio.tenants.subdomain}.compsync.net`;
          const branding = studio.tenants?.branding as { primaryColor?: string; secondaryColor?: string } | null;
          const data = {
            studioName: studio.name,
            competitionName: competition.name,
            competitionYear: competition.year,
            routinesWithoutMusic: entriesWithoutMusic.map((entry) => ({
              title: entry.title,
              entryNumber: entry.entry_number || undefined,
              category: entry.dance_categories?.name || 'N/A',
            })),
            portalUrl,
            daysUntilCompetition,
            tenantBranding: branding || undefined,
          };

          const html = await renderMissingMusicReminder(data);
          const subject = getEmailSubject('missing-music', data);

          const result = await sendEmail({
            to: studio.email,
            subject,
            html,
            templateType: 'missing-music',
            studioId: studio.id,
            competitionId: input.competitionId,
          });

          results.push({
            studioId: studio.id,
            studioName: studio.name,
            success: result.success,
            error: result.error,
          });
        } catch (error) {
          results.push({
            studioId: studio.id,
            studioName: studio.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return {
        totalStudios: studiosWithMissingMusic.length,
        successCount,
        failureCount,
        results,
      };
    }),

  /**
   * Export missing music report as CSV
   */
  exportMissingMusicCSV: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: any = {
        music_file_url: null,
        status: { not: 'cancelled' },
      };

      if (input.competitionId) {
        where.competition_id = input.competitionId;
      }

      const routinesWithoutMusic = await prisma.competition_entries.findMany({
        where,
        select: {
          title: true,
          entry_number: true,
          studios: {
            select: {
              name: true,
              code: true,
              email: true,
            },
          },
          competitions: {
            select: {
              name: true,
              year: true,
            },
          },
          dance_categories: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { competition_id: 'asc' },
          { studio_id: 'asc' },
          { entry_number: 'asc' },
        ],
      });

      // RFC 4180 compliant CSV formatting
      const escapeCSV = (value: string | null | undefined): string => {
        if (value === null || value === undefined) {
          return '';
        }
        const str = String(value);
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = [
        'Competition',
        'Year',
        'Studio Name',
        'Studio Code',
        'Studio Email',
        'Routine #',
        'Routine Title',
        'Category',
      ];

      const rows = routinesWithoutMusic.map((entry) => [
        escapeCSV(entry.competitions.name),
        escapeCSV(String(entry.competitions.year)),
        escapeCSV(entry.studios.name),
        escapeCSV(entry.studios.code),
        escapeCSV(entry.studios.email),
        escapeCSV(entry.entry_number ? String(entry.entry_number) : ''),
        escapeCSV(entry.title),
        escapeCSV(entry.dance_categories?.name || 'N/A'),
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      return { csv };
    }),

  // ======================================
  // GAME DAY MP3 ENDPOINTS
  // ======================================

  /**
   * Get signed URL for a single MP3 file
   * Returns cached URL if available, otherwise creates new signed URL
   */
  getMP3Url: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      // Check cache first
      const cached = urlCache.get(input.entryId);
      if (cached && cached.expiry > Date.now()) {
        const entry = await prisma.competition_entries.findUnique({
          where: { id: input.entryId },
          select: { mp3_duration_ms: true },
        });
        return {
          url: cached.url,
          durationMs: entry?.mp3_duration_ms || null,
          cached: true,
        };
      }

      // Get entry with music URL
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.entryId },
        select: {
          id: true,
          music_file_url: true,
          mp3_duration_ms: true,
        },
      });

      if (!entry) {
        throw new Error('Entry not found');
      }

      if (!entry.music_file_url) {
        throw new Error('No music file uploaded for this entry');
      }

      // Create signed URL from Supabase
      const supabase = await createServerSupabaseClient();

      // Extract path from URL (assumes format: bucket/path/to/file.mp3)
      const urlParts = entry.music_file_url.split('/');
      const bucketIndex = urlParts.findIndex((p) => p === 'music');
      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      const { data, error } = await supabase.storage
        .from('music')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error || !data?.signedUrl) {
        throw new Error(`Failed to create signed URL: ${error?.message || 'Unknown error'}`);
      }

      // Cache the URL
      urlCache.set(input.entryId, {
        url: data.signedUrl,
        expiry: Date.now() + URL_CACHE_TTL,
      });

      return {
        url: data.signedUrl,
        durationMs: entry.mp3_duration_ms || null,
        cached: false,
      };
    }),

  /**
   * Get MP3 upload/download status for a competition
   * Returns count of total, uploaded, and missing files
   */
  getMP3Status: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const [total, uploaded] = await Promise.all([
        prisma.competition_entries.count({
          where: {
            competition_id: input.competitionId,
            status: { not: 'cancelled' },
          },
        }),
        prisma.competition_entries.count({
          where: {
            competition_id: input.competitionId,
            status: { not: 'cancelled' },
            music_file_url: { not: null },
          },
        }),
      ]);

      // Get list of routines missing MP3s
      const missingRoutines = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          status: { not: 'cancelled' },
          music_file_url: null,
        },
        select: {
          id: true,
          entry_number: true,
          title: true,
          studios: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { entry_number: 'asc' },
      });

      return {
        total,
        uploaded,
        missing: total - uploaded,
        missingRoutines: missingRoutines.map((r) => ({
          id: r.id,
          entryNumber: r.entry_number,
          title: r.title,
          studioName: r.studios?.name || 'Unknown',
        })),
      };
    }),

  /**
   * Get all MP3 URLs for a competition (for bulk download)
   * Used by Backstage for offline prefetch
   */
  bulkGetMP3Urls: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      // Get all entries with music
      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competitionId,
          status: { not: 'cancelled' },
          music_file_url: { not: null },
        },
        select: {
          id: true,
          entry_number: true,
          title: true,
          music_file_url: true,
          mp3_duration_ms: true,
          studio_id: true,
          studios: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { entry_number: 'asc' },
      });

      if (entries.length === 0) {
        return { files: [] };
      }

      // Create signed URLs for all files
      const supabase = await createServerSupabaseClient();

      const files = await Promise.all(
        entries.map(async (entry) => {
          try {
            // Check cache first
            const cached = urlCache.get(entry.id);
            if (cached && cached.expiry > Date.now()) {
              return {
                entryId: entry.id,
                entryNumber: entry.entry_number,
                title: entry.title,
                studioName: entry.studios?.name || 'Unknown',
                studioId: entry.studio_id,
                url: cached.url,
                durationMs: entry.mp3_duration_ms,
                filePath: entry.music_file_url,
              };
            }

            // Extract path from URL
            const urlParts = (entry.music_file_url || '').split('/');
            const bucketIndex = urlParts.findIndex((p) => p === 'music');
            const filePath = urlParts.slice(bucketIndex + 1).join('/');

            const { data, error } = await supabase.storage
              .from('music')
              .createSignedUrl(filePath, 3600);

            if (error || !data?.signedUrl) {
              console.error(`Failed to create signed URL for ${entry.id}:`, error);
              return null;
            }

            // Cache the URL
            urlCache.set(entry.id, {
              url: data.signedUrl,
              expiry: Date.now() + URL_CACHE_TTL,
            });

            return {
              entryId: entry.id,
              entryNumber: entry.entry_number,
              title: entry.title,
              studioName: entry.studios?.name || 'Unknown',
              studioId: entry.studio_id,
              url: data.signedUrl,
              durationMs: entry.mp3_duration_ms,
              filePath: entry.music_file_url,
            };
          } catch (err) {
            console.error(`Error processing ${entry.id}:`, err);
            return null;
          }
        })
      );

      return {
        files: files.filter((f): f is NonNullable<typeof f> => f !== null),
      };
    }),

  /**
   * Update MP3 duration for an entry
   * Called after client-side duration extraction
   */
  updateMP3Duration: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        durationMs: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.competition_entries.update({
        where: { id: input.entryId },
        data: { mp3_duration_ms: input.durationMs },
      });

      return { success: true };
    }),

  /**
   * Clear URL cache (admin utility)
   */
  clearUrlCache: publicProcedure.mutation(async () => {
    urlCache.clear();
    return { success: true, message: 'URL cache cleared' };
  }),
});
