import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { sendEmail } from '@/lib/email';
import {
  renderRegistrationConfirmation,
  renderInvoiceDelivery,
  renderReservationApproved,
  renderEntrySubmitted,
  getEmailSubject,
  type RegistrationConfirmationData,
  type InvoiceDeliveryData,
  type ReservationApprovedData,
  type EntrySubmittedData,
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
        entryCount: entries.length,
        invoiceUrl: input.invoiceUrl,
        dueDate: input.dueDate,
      };

      const html = await renderInvoiceDelivery(data);
      const subject = getEmailSubject('invoice', { ...data });

      const result = await sendEmail({
        to: studio.email,
        subject,
        html,
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
      });

      return result;
    }),

  /**
   * Preview email template (for testing/development)
   */
  previewTemplate: publicProcedure
    .input(
      z.object({
        template: z.enum(['registration', 'invoice', 'reservation', 'entry']),
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
        default:
          throw new Error('Invalid template');
      }

      return { html };
    }),

  /**
   * Get email history (placeholder for future implementation)
   */
  getHistory: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async () => {
      // TODO: Implement email history tracking in database
      return {
        emails: [],
        total: 0,
      };
    }),
});
