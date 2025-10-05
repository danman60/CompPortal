import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { sendEmail } from '@/lib/email';
import {
  renderRegistrationConfirmation,
  renderInvoiceDelivery,
  renderReservationApproved,
  renderEntrySubmitted,
  renderMissingMusicReminder,
  getEmailSubject,
  type RegistrationConfirmationData,
  type InvoiceDeliveryData,
  type ReservationApprovedData,
  type EntrySubmittedData,
  type MissingMusicReminderData,
} from '@/lib/email-templates';
import { prisma } from '@/lib/prisma';

/**
 * Email router for sending transactional emails
 */
export const emailRouter = router({
  /**
   * Send registration confirmation email
   */
  sendRegistrationConfirmation: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
        competitionId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const [studio, competition] = await Promise.all([
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
            contact_email: true,
          },
        }),
      ]);

      if (!studio || !competition) {
        throw new Error('Studio or competition not found');
      }

      if (!studio.email) {
        throw new Error('Studio email not found');
      }

      const data: RegistrationConfirmationData = {
        studioName: studio.name,
        competitionName: competition.name,
        competitionYear: competition.year,
        competitionDate: competition.competition_start_date
          ? new Date(competition.competition_start_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : undefined,
        contactEmail: competition.contact_email || 'info@glowdance.com',
      };

      const html = await renderRegistrationConfirmation(data);
      const subject = getEmailSubject('registration', data);

      const result = await sendEmail({
        to: studio.email,
        subject,
        html,
        templateType: 'registration',
        studioId: input.studioId,
        competitionId: input.competitionId,
      });

      return result;
    }),

  /**
   * Send invoice delivery email
   */
  sendInvoiceDelivery: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
        competitionId: z.string().uuid(),
        invoiceUrl: z.string().url(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [studio, competition, entries] = await Promise.all([
        prisma.studios.findUnique({
          where: { id: input.studioId },
          select: { name: true, email: true, code: true },
        }),
        prisma.competitions.findUnique({
          where: { id: input.competitionId },
          select: { name: true, year: true },
        }),
        prisma.competition_entries.findMany({
          where: {
            studio_id: input.studioId,
            competition_id: input.competitionId,
            status: { not: 'cancelled' },
          },
          select: {
            entry_fee: true,
            late_fee: true,
          },
        }),
      ]);

      if (!studio || !competition) {
        throw new Error('Studio or competition not found');
      }

      if (!studio.email) {
        throw new Error('Studio email not found');
      }

      const totalAmount = entries.reduce(
        (sum, entry) =>
          sum + Number(entry.entry_fee || 0) + Number(entry.late_fee || 0),
        0
      );

      const timestamp = Date.now();
      const invoiceNumber = `INV-${competition.year}-${studio.code}-${timestamp}`;

      const data: InvoiceDeliveryData = {
        studioName: studio.name,
        competitionName: competition.name,
        competitionYear: competition.year,
        invoiceNumber,
        totalAmount,
        routineCount: entries.length,
        invoiceUrl: input.invoiceUrl,
        dueDate: input.dueDate,
      };

      const html = await renderInvoiceDelivery(data);
      const subject = getEmailSubject('invoice', { ...data });

      const result = await sendEmail({
        to: studio.email,
        subject,
        html,
        templateType: 'invoice',
        studioId: input.studioId,
        competitionId: input.competitionId,
      });

      return result;
    }),

  /**
   * Send reservation approved email
   */
  sendReservationApproved: publicProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        portalUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: {
            select: { name: true, email: true },
          },
          competitions: {
            select: { name: true, year: true },
          },
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (!reservation.studios.email) {
        throw new Error('Studio email not found');
      }

      const data: ReservationApprovedData = {
        studioName: reservation.studios.name,
        competitionName: reservation.competitions.name,
        competitionYear: reservation.competitions.year,
        spacesConfirmed: reservation.spaces_confirmed || 0,
        portalUrl: input.portalUrl,
      };

      const html = await renderReservationApproved(data);
      const subject = getEmailSubject('reservation-approved', data);

      const result = await sendEmail({
        to: reservation.studios.email,
        subject,
        html,
        templateType: 'reservation-approved',
        studioId: reservation.studio_id,
        competitionId: reservation.competition_id,
      });

      return result;
    }),

  /**
   * Send entry submitted email
   */
  sendEntrySubmitted: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.entryId },
        include: {
          studios: {
            select: { name: true, email: true },
          },
          competitions: {
            select: { name: true, year: true },
          },
          dance_categories: {
            select: { name: true },
          },
          entry_size_categories: {
            select: { name: true },
          },
          entry_participants: {
            select: { id: true },
          },
        },
      });

      if (!entry) {
        throw new Error('Entry not found');
      }

      if (!entry.studios.email) {
        throw new Error('Studio email not found');
      }

      const data: EntrySubmittedData = {
        studioName: entry.studios.name,
        competitionName: entry.competitions.name,
        competitionYear: entry.competitions.year,
        entryTitle: entry.title,
        entryNumber: entry.entry_number || undefined,
        category: entry.dance_categories?.name || 'N/A',
        sizeCategory: entry.entry_size_categories?.name || 'N/A',
        participantCount: entry.entry_participants.length,
        entryFee: Number(entry.entry_fee || 0) + Number(entry.late_fee || 0),
      };

      const html = await renderEntrySubmitted(data);
      const subject = getEmailSubject('entry', data);

      const result = await sendEmail({
        to: entry.studios.email,
        subject,
        html,
        templateType: 'entry',
        studioId: entry.studio_id,
        competitionId: entry.competition_id,
      });

      return result;
    }),

  /**
   * Send missing music reminder email
   */
  sendMissingMusicReminder: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
        competitionId: z.string().uuid(),
        portalUrl: z.string().url(),
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

      const data: MissingMusicReminderData = {
        studioName: studio.name,
        competitionName: competition.name,
        competitionYear: competition.year,
        routinesWithoutMusic: entriesWithoutMusic.map((entry) => ({
          title: entry.title,
          entryNumber: entry.entry_number || undefined,
          category: entry.dance_categories?.name || 'N/A',
        })),
        portalUrl: input.portalUrl,
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

  /**
   * Preview email template (for testing/development)
   */
  previewTemplate: publicProcedure
    .input(
      z.object({
        template: z.enum(['registration', 'invoice', 'reservation', 'entry', 'missing-music']),
        data: z.any(),
      })
    )
    .query(async ({ input }) => {
      let html: string;

      switch (input.template) {
        case 'registration':
          html = await renderRegistrationConfirmation(input.data);
          break;
        case 'invoice':
          html = await renderInvoiceDelivery(input.data);
          break;
        case 'reservation':
          html = await renderReservationApproved(input.data);
          break;
        case 'entry':
          html = await renderEntrySubmitted(input.data);
          break;
        case 'missing-music':
          html = await renderMissingMusicReminder(input.data);
          break;
        default:
          throw new Error('Invalid template');
      }

      return { html };
    }),

  /**
   * Get email history
   */
  getHistory: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid().optional(),
        competitionId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};

      if (input.studioId) {
        where.studio_id = input.studioId;
      }

      if (input.competitionId) {
        where.competition_id = input.competitionId;
      }

      const [emails, total] = await Promise.all([
        prisma.email_logs.findMany({
          where,
          orderBy: { sent_at: 'desc' },
          take: input.limit,
          skip: input.offset,
          include: {
            studios: {
              select: { name: true },
            },
            competitions: {
              select: { name: true, year: true },
            },
          },
        }),
        prisma.email_logs.count({ where }),
      ]);

      return {
        emails: emails.map((email) => ({
          id: email.id,
          templateType: email.template_type,
          recipientEmail: email.recipient_email,
          subject: email.subject,
          studioName: email.studios?.name || null,
          competitionName: email.competitions?.name || null,
          competitionYear: email.competitions?.year || null,
          success: email.success,
          errorMessage: email.error_message || null,
          sentAt: email.sent_at,
        })),
        total,
      };
    }),
});
