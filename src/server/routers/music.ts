import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

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
          select: { name: true, email: true },
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

      const data = {
        studioName: studio.name,
        competitionName: competition.name,
        competitionYear: competition.year,
        routinesWithoutMusic: entriesWithoutMusic.map((entry) => ({
          title: entry.title,
          entryNumber: entry.entry_number || undefined,
          category: entry.dance_categories?.name || 'N/A',
        })),
        portalUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://portal.glowdance.com',
        daysUntilCompetition,
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
});
