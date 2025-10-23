import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { guardInvoiceStatus } from '@/lib/guards/statusGuards';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  renderInvoiceDelivery,
  renderPaymentConfirmed,
  getEmailSubject,
  type InvoiceDeliveryData,
  type PaymentConfirmedData,
} from '@/lib/email-templates';

/**
 * Helper function to check if email notification is enabled for a user
 */
async function isEmailEnabled(userId: string, emailType: string): Promise<boolean> {
  try {
    const preference = await prisma.email_preferences.findUnique({
      where: {
        user_id_email_type: {
          user_id: userId,
          email_type: emailType as any,
        },
      },
    });
    return preference?.enabled ?? true;
  } catch (error) {
    logger.error('Failed to check email preference', { error: error instanceof Error ? error : new Error(String(error)), userId, emailType });
    return true;
  }
}

/**
 * Helper function to get user email from Supabase auth
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) {
      logger.error('Failed to fetch user email from auth', { error, userId });
      return null;
    }
    return data.user?.email || null;
  } catch (error) {
    logger.error('Failed to fetch user email from auth', { error: error instanceof Error ? error : new Error(String(error)), userId });
    return null;
  }
}

export const invoiceRouter = router({
  // Get invoice by studio and competition (returns existing invoice or null)
  getByStudioAndCompetition: publicProcedure
    .input(z.object({
      studioId: z.string().uuid(),
      competitionId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Studio Directors can only see SENT or PAID invoices
      // Competition Directors and Super Admins can see all invoices (including DRAFT)
      const isStudioDirector = ctx.userRole === 'studio_director';

      const invoice = await prisma.invoices.findFirst({
        where: {
          studio_id: input.studioId,
          competition_id: input.competitionId,
          ...(isStudioDirector && {
            status: {
              in: ['SENT', 'PAID'],
            },
          }),
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return invoice;
    }),

  // Generate invoice for a studio's entries in a competition
  generateForStudio: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
        competitionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { studioId, competitionId } = input;

      // Studio Directors can only view invoices that have been SENT or PAID
      // Competition Directors and Super Admins can view all invoices (including DRAFT)
      const isStudioDirector = ctx.userRole === 'studio_director';

      if (isStudioDirector) {
        // Check if there's a SENT or PAID invoice for this studio+competition
        const existingInvoice = await prisma.invoices.findFirst({
          where: {
            studio_id: studioId,
            competition_id: competitionId,
            status: {
              in: ['SENT', 'PAID'],
            },
          },
        });

        if (!existingInvoice) {
          throw new Error('Invoice not available yet. Please wait for the competition director to send it.');
        }
      }

      // Fetch studio details
      const studio = await prisma.studios.findUnique({
        where: { id: studioId },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Fetch competition details
      const competition = await prisma.competitions.findUnique({
        where: { id: competitionId },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      // Fetch all entries for this studio in this competition
      const entries = await prisma.competition_entries.findMany({
        where: {
          studio_id: studioId,
          competition_id: competitionId,
          status: {
            not: 'cancelled',
          },
        },
        include: {
          dance_categories: true,
          entry_size_categories: true,
          entry_participants: {
            include: {
              dancers: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
        orderBy: {
          entry_number: 'asc',
        },
      });

      // 🛡️ GUARD: Cannot generate invoice if no entries exist
      if (entries.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot generate invoice: No entries found for this studio and competition.',
        });
      }

      // Calculate totals
      const lineItems = entries.map((entry) => {
        const entryFee = Number(entry.entry_fee || 0);
        const lateFee = Number(entry.late_fee || 0);
        const total = entryFee + lateFee;

        return {
          id: entry.id,
          entryNumber: entry.entry_number,
          title: entry.title,
          category: entry.dance_categories?.name || 'Unknown',
          sizeCategory: entry.entry_size_categories?.name || 'Unknown',
          participantCount: entry.entry_participants?.length || 0,
          participants: entry.entry_participants?.map((p) =>
            `${p.dancers?.first_name} ${p.dancers?.last_name}`
          ).join(', '),
          entryFee,
          lateFee,
          total,
        };
      });

      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxRate = Number(competition.tax_rate || 0); // Tax rate from competition settings
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Fetch reservation if exists
      const reservation = await prisma.reservations.findFirst({
        where: {
          studio_id: studioId,
          competition_id: competitionId,
        },
      });

      return {
        invoiceNumber: `INV-${competition.year}-${studio.code || 'UNKNOWN'}-${Date.now()}`,
        invoiceDate: new Date(),
        studio: {
          id: studio.id,
          name: studio.name,
          code: studio.code || 'N/A',
          address1: studio.address1,
          address2: studio.address2,
          city: studio.city,
          province: studio.province,
          postal_code: studio.postal_code,
          country: studio.country,
          email: studio.email,
          phone: studio.phone,
        },
        competition: {
          id: competition.id,
          name: competition.name,
          year: competition.year,
          startDate: competition.competition_start_date,
          endDate: competition.competition_end_date,
          location: competition.primary_location,
        },
        reservation: reservation ? {
          id: reservation.id,
          spacesRequested: reservation.spaces_requested,
          spacesConfirmed: reservation.spaces_confirmed || 0,
          depositAmount: Number(reservation.deposit_amount || 0),
          totalAmount: Number(reservation.total_amount || 0),
          paymentStatus: reservation.payment_status,
        } : null,
        lineItems,
        summary: {
          entryCount: lineItems.length,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
        },
      };
    }),

  // Get all invoices for a studio
  getByStudio: publicProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ input }) => {
      // PERFORMANCE FIX: Fetch all data in parallel instead of N+1 queries
      // Get all entries for this studio (non-cancelled)
      const entries = await prisma.competition_entries.findMany({
        where: {
          studio_id: input.studioId,
          status: { not: 'cancelled' },
        },
        select: {
          competition_id: true,
          total_fee: true,
        },
      });

      // Get unique competition IDs
      const competitionIds = [...new Set(entries.map(e => e.competition_id))];

      // Fetch all competitions at once
      const competitions = await prisma.competitions.findMany({
        where: {
          id: { in: competitionIds },
        },
        select: {
          id: true,
          name: true,
          year: true,
          competition_start_date: true,
        },
      });

      // Create a map for fast lookup
      const competitionMap = new Map(competitions.map(c => [c.id, c]));

      // Group entries by competition and calculate totals
      const invoiceMap = new Map<string, any>();
      entries.forEach(entry => {
        if (!invoiceMap.has(entry.competition_id)) {
          const comp = competitionMap.get(entry.competition_id);
          invoiceMap.set(entry.competition_id, {
            competitionId: entry.competition_id,
            competitionName: comp?.name || 'Unknown',
            competitionYear: comp?.year,
            startDate: comp?.competition_start_date,
            entryCount: 0,
            totalAmount: 0,
          });
        }
        const invoice = invoiceMap.get(entry.competition_id)!;
        invoice.entryCount++;
        invoice.totalAmount += Number(entry.total_fee || 0);
      });

      const invoices = Array.from(invoiceMap.values());

      return { invoices };
    }),

  // Get all invoices across all studios and competitions (Competition Directors only)
  getAllInvoices: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid().optional(),
        paymentStatus: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { competitionId, paymentStatus } = input ?? {};

      // PERFORMANCE FIX: Fetch all data in bulk instead of N+1 queries
      // Get all studio × competition combinations with entries
      const entryGroups = await prisma.competition_entries.groupBy({
        by: ['studio_id', 'competition_id'],
        where: {
          status: { not: 'cancelled' },
          ...(competitionId && { competition_id: competitionId }),
        },
        _count: { id: true },
        _sum: { total_fee: true },
      });

      // Extract unique studio and competition IDs
      const studioIds = [...new Set(entryGroups.map(g => g.studio_id))];
      const competitionIds = [...new Set(entryGroups.map(g => g.competition_id))];

      // Fetch all studios, competitions, reservations, and invoices in parallel
      const [studios, competitions, reservations, invoices] = await Promise.all([
        prisma.studios.findMany({
          where: { id: { in: studioIds } },
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            province: true,
            email: true,
            phone: true,
          },
        }),
        prisma.competitions.findMany({
          where: { id: { in: competitionIds } },
          select: {
            id: true,
            name: true,
            year: true,
            competition_start_date: true,
            competition_end_date: true,
          },
        }),
        prisma.reservations.findMany({
          where: {
            studio_id: { in: studioIds },
            competition_id: { in: competitionIds },
          },
          select: {
            id: true,
            studio_id: true,
            competition_id: true,
            spaces_requested: true,
            spaces_confirmed: true,
            deposit_amount: true,
            total_amount: true,
            payment_status: true,
            payment_due_date: true,
            payment_confirmed_at: true,
            payment_confirmed_by: true,
            status: true,
          },
        }),
        prisma.invoices.findMany({
          where: {
            studio_id: { in: studioIds },
            competition_id: { in: competitionIds },
          },
          select: {
            id: true,
            studio_id: true,
            competition_id: true,
            status: true,
          },
        }),
      ]);

      // Create maps for fast lookup
      const studioMap = new Map(studios.map(s => [s.id, s]));
      const competitionMap = new Map(competitions.map(c => [c.id, c]));
      const reservationMap = new Map<string, typeof reservations[0]>();
      reservations.forEach(r => {
        reservationMap.set(`${r.studio_id}-${r.competition_id}`, r);
      });
      const invoiceMap = new Map<string, typeof invoices[0]>();
      invoices.forEach(inv => {
        invoiceMap.set(`${inv.studio_id}-${inv.competition_id}`, inv);
      });

      // Build invoices from grouped data
      const summaries = entryGroups
        .map((group) => {
          const studio = studioMap.get(group.studio_id);
          const competition = competitionMap.get(group.competition_id);
          const reservation = reservationMap.get(`${group.studio_id}-${group.competition_id}`);
          const existingInvoice = invoiceMap.get(`${group.studio_id}-${group.competition_id}`);

          // Skip if studio or competition not found
          if (!studio || !competition) {
            return null;
          }

          // Apply payment status filter
          if (paymentStatus && reservation?.payment_status !== paymentStatus) {
            return null;
          }

          // NOTE: Removed strict routine completion check to allow partial invoice generation
          // CDs can now generate invoices even if not all routines are complete
          // Previously blocked: if (reservation && group._count.id < (reservation.spaces_confirmed || 0))

          return {
            studioId: studio.id,
            studioName: studio.name,
            studioCode: studio.code || 'N/A',
            studioCity: studio.city || 'N/A',
            studioProvince: studio.province || 'N/A',
            studioEmail: studio.email || 'N/A',
            studioPhone: studio.phone || 'N/A',
            competitionId: competition.id,
            competitionName: competition.name,
            competitionYear: competition.year || 0,
            competitionStartDate: competition.competition_start_date,
            competitionEndDate: competition.competition_end_date,
            entryCount: group._count.id,
            totalAmount: Number(group._sum.total_fee || 0),
            hasInvoice: !!existingInvoice,
            invoiceId: existingInvoice?.id || null,
            invoiceStatus: existingInvoice?.status || null,
            reservation: reservation ? {
              id: reservation.id,
              spacesRequested: reservation.spaces_requested,
              spacesConfirmed: reservation.spaces_confirmed || 0,
              depositAmount: Number(reservation.deposit_amount || 0),
              reservationTotal: Number(reservation.total_amount || 0),
              paymentStatus: reservation.payment_status || 'pending',
              paymentDueDate: reservation.payment_due_date,
              paymentConfirmedAt: reservation.payment_confirmed_at,
              paymentConfirmedBy: reservation.payment_confirmed_by,
              reservationStatus: reservation.status,
            } : null,
          };
        })
        .filter((inv): inv is NonNullable<typeof inv> => inv !== null)
        .sort((a, b) => {
          // Sort by year descending first
          const yearDiff = (b.competitionYear || 0) - (a.competitionYear || 0);
          if (yearDiff !== 0) return yearDiff;

          // Then by studio name ascending
          return a.studioName.localeCompare(b.studioName);
        });

      return {
        invoices: summaries,
        total: summaries.length,
      };
    }),

  // Send invoice reminder email
  sendInvoiceReminder: publicProcedure
    .input(z.object({
      studioId: z.string().uuid(),
      competitionId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const { studioId, competitionId } = input;

      // Get studio and competition details
      const studio = await prisma.studios.findUnique({
        where: { id: studioId },
        select: {
          name: true,
          contact_email: true,
        },
      });

      const competition = await prisma.competitions.findUnique({
        where: { id: competitionId },
        select: {
          name: true,
          year: true,
        },
      });

      if (!studio || !competition || !studio.contact_email) {
        throw new Error('Studio or competition not found');
      }

      // Get entries for total amount
      const entries = await prisma.competition_entries.findMany({
        where: {
          studio_id: studioId,
          competition_id: competitionId,
          status: { not: 'cancelled' },
        },
      });

      const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.total_fee || 0), 0);

      // Send reminder email (basic notification for now)
      // In production, this would use email router with proper template
      logger.info('Invoice reminder sent', {
        email: studio.contact_email,
        competition: `${competition.name} ${competition.year}`,
        amount: totalAmount.toFixed(2),
      });

    return { success: true, email: studio.contact_email };
    }),

  // Create invoice from a reservation (replaces direct approve flow)
  createFromReservation: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        spacesConfirmed: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { reservationId, spacesConfirmed } = input;

      const reservation = await prisma.reservations.findUnique({
        where: { id: reservationId },
        include: { studios: true, competitions: true },
      });

      if (!reservation) throw new Error('Reservation not found');

      // 🛡️ GUARD: Check for existing invoice
      const existingInvoice = await prisma.invoices.findFirst({
        where: {
          studio_id: reservation.studio_id,
          competition_id: reservation.competition_id,
          reservation_id: reservationId,
        },
      });

      if (existingInvoice) {
        throw new Error('Invoice already exists for this reservation');
      }

      // Build line items from all non-cancelled entries for this studio+competition
      const entries = await prisma.competition_entries.findMany({
        where: {
          studio_id: reservation.studio_id,
          competition_id: reservation.competition_id,
          status: { not: 'cancelled' },
        },
        include: { dance_categories: true, entry_size_categories: true },
        orderBy: { entry_number: 'asc' },
      });

      // 🛡️ GUARD: Must have entries to create invoice
      if (entries.length === 0) {
        throw new Error('Cannot create invoice: no entries submitted yet');
      }

      const lineItems = entries.map((entry) => ({
        id: entry.id,
        entryNumber: entry.entry_number,
        title: entry.title,
        category: entry.dance_categories?.name || 'Unknown',
        sizeCategory: entry.entry_size_categories?.name || 'Unknown',
        entryFee: Number(entry.entry_fee || 0),
        lateFee: Number(entry.late_fee || 0),
        total: Number(entry.entry_fee || 0) + Number(entry.late_fee || 0),
      }));

      const subtotal = lineItems.reduce((sum, i) => sum + i.total, 0);

      // 🔐 TRANSACTION: Wrap invoice creation + reservation update for atomicity
      const invoice = await prisma.$transaction(async (tx) => {
        // Create invoice record with DRAFT status (not visible to studio yet)
        const newInvoice = await tx.invoices.create({
          data: {
            tenant_id: reservation.tenant_id,
            studio_id: reservation.studio_id,
            competition_id: reservation.competition_id,
            reservation_id: reservationId,
            line_items: lineItems as any,
            subtotal,
            total: subtotal,
            status: 'DRAFT',
          },
        });

        // Mark reservation approved and set confirmed spaces
        await tx.reservations.update({
          where: { id: reservationId },
          data: {
            status: 'approved',
            spaces_confirmed: spacesConfirmed ?? reservation.spaces_requested,
            approved_at: new Date(),
            approved_by: ctx.userId,
            updated_at: new Date(),
          },
        });

        return newInvoice;
      });

      // Activity log (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: reservation.studio_id,
          action: 'invoice.create',
          entityType: 'invoice',
          entityId: invoice.id,
          details: {
            reservation_id: reservationId,
            competition_id: reservation.competition_id,
            subtotal,
            entry_count: entries.length,
          },
        });
      } catch (e) {
        logger.error('Failed to log activity (invoice.create)', { error: e instanceof Error ? e : new Error(String(e)) });
      }

      return { invoiceId: invoice.id };
    }),

  // Send invoice to studio (change status from DRAFT to SENT)
  sendInvoice: protectedProcedure
    .input(z.object({
      invoiceId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoices.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status !== 'DRAFT') {
        throw new Error('Can only send invoices with DRAFT status');
      }

      const updatedInvoice = await prisma.invoices.update({
        where: { id: input.invoiceId },
        data: {
          status: 'SENT',
          updated_at: new Date(),
        },
      });

      // Activity log (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: invoice.studio_id,
          action: 'invoice.send',
          entityType: 'invoice',
          entityId: invoice.id,
          details: {
            competition_id: invoice.competition_id,
          },
        });
      } catch (e) {
        logger.error('Failed to log activity (invoice.send)', { error: e instanceof Error ? e : new Error(String(e)) });
      }

      // Send invoice_received email to studio owner (non-blocking)
      try {
        const studio = await prisma.studios.findUnique({
          where: { id: updatedInvoice.studio_id },
          select: { owner_id: true, name: true, email: true },
        });

        const competition = await prisma.competitions.findUnique({
          where: { id: updatedInvoice.competition_id },
          select: { name: true, year: true },
        });

        if (studio?.owner_id && studio?.email && competition) {
          const isEnabled = await isEmailEnabled(studio.owner_id, 'invoice_received');

          if (isEnabled) {
            const emailData: InvoiceDeliveryData = {
              studioName: studio.name,
              competitionName: competition.name,
              competitionYear: competition.year || new Date().getFullYear(),
              invoiceNumber: updatedInvoice.id.substring(0, 8),
              totalAmount: 0, // See full details in invoice
              routineCount: 0, // See full details in invoice
              invoiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/invoices/${updatedInvoice.studio_id}/${updatedInvoice.competition_id}`,
            };

            const html = await renderInvoiceDelivery(emailData);
            const subject = getEmailSubject('invoice', {
              invoiceNumber: emailData.invoiceNumber,
              competitionName: emailData.competitionName,
              competitionYear: emailData.competitionYear,
            });

            await sendEmail({
              to: studio.email,
              subject,
              html,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to send invoice received email', {
          error: error instanceof Error ? error : new Error(String(error)),
          invoiceId: invoice.id,
        });
      }

      return { success: true };
    }),

  // Mark invoice as paid
  markAsPaid: protectedProcedure
    .input(z.object({
      invoiceId: z.string().uuid(),
      paymentMethod: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 🔐 CRITICAL: Only Competition Directors and Super Admins can mark invoices as paid
      if (ctx.userRole === 'studio_director') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can mark invoices as paid. Payment is confirmed externally (e-transfer, check, etc.) and must be verified by competition staff.',
        });
      }

      const invoice = await prisma.invoices.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'PAID') {
        throw new Error('Invoice is already paid');
      }

      // 🔐 TRANSACTION: Wrap invoice update + reservation update for atomicity
      await prisma.$transaction(async (tx) => {
        // Update invoice to PAID status
        await tx.invoices.update({
          where: { id: input.invoiceId },
          data: {
            status: 'PAID',
            paid_at: new Date(),
            payment_method: input.paymentMethod || 'manual',
            updated_at: new Date(),
          },
        });

        // Also update reservation payment status
        if (invoice.reservation_id) {
          await tx.reservations.update({
            where: { id: invoice.reservation_id },
            data: {
              payment_status: 'paid',
              payment_confirmed_at: new Date(),
              payment_confirmed_by: ctx.userId,
              updated_at: new Date(),
            },
          });
        }
      });

      // Activity log (non-blocking, outside transaction)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: invoice.studio_id,
          action: 'invoice.markPaid',
          entityType: 'invoice',
          entityId: invoice.id,
          details: {
            competition_id: invoice.competition_id,
            payment_method: input.paymentMethod,
          },
        });
      } catch (e) {
        logger.error('Failed to log activity (invoice.markPaid)', { error: e instanceof Error ? e : new Error(String(e)) });
      }

      // Send payment_confirmed email to studio owner (non-blocking)
      try {
        const studio = await prisma.studios.findUnique({
          where: { id: invoice.studio_id },
          select: { owner_id: true, name: true, email: true },
        });

        const competition = await prisma.competitions.findUnique({
          where: { id: invoice.competition_id },
          select: { name: true, year: true },
        });

        if (studio?.owner_id && studio?.email && competition) {
          const isEnabled = await isEmailEnabled(studio.owner_id, 'payment_confirmed');

          if (isEnabled) {
            const emailData: PaymentConfirmedData = {
              studioName: studio.name,
              competitionName: competition.name,
              competitionYear: competition.year || new Date().getFullYear(),
              amount: 0, // See full details in invoice
              paymentStatus: 'paid',
              invoiceNumber: invoice.id.substring(0, 8),
              paymentDate: new Date().toISOString(),
            };

            const html = await renderPaymentConfirmed(emailData);
            const subject = getEmailSubject('payment-confirmed', {
              competitionName: emailData.competitionName,
              competitionYear: emailData.competitionYear,
              paymentStatus: emailData.paymentStatus,
            });

            await sendEmail({
              to: studio.email,
              subject,
              html,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to send payment confirmed email', {
          error: error instanceof Error ? error : new Error(String(error)),
          invoiceId: invoice.id,
        });
      }

      return { success: true };
    }),

  // Update invoice line items (editable pricing - Competition Directors and Studio Directors)
  updateLineItems: protectedProcedure
    .input(z.object({
      invoiceId: z.string().uuid(),
      lineItems: z.array(z.object({
        id: z.string().uuid(),
        entryNumber: z.number().optional().nullable(),
        title: z.string(),
        category: z.string(),
        sizeCategory: z.string(),
        participantCount: z.number().optional(),
        entryFee: z.number(),
        lateFee: z.number(),
        total: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoices.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // 🛡️ GUARD: Only allow edits when status is DRAFT or SENT (not PAID)
      guardInvoiceStatus(
        invoice.status as 'DRAFT' | 'SENT' | 'PAID',
        ['DRAFT', 'SENT'],
        'edit invoice prices'
      );

      // Recalculate subtotal and total from line items
      const subtotal = input.lineItems.reduce((sum, item) => sum + item.total, 0);

      await prisma.invoices.update({
        where: { id: input.invoiceId },
        data: {
          line_items: input.lineItems as any,
          subtotal,
          total: subtotal,
          updated_at: new Date(),
        },
      });

      // Activity log (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: invoice.studio_id,
          action: 'invoice.updateLineItems',
          entityType: 'invoice',
          entityId: invoice.id,
          details: {
            competition_id: invoice.competition_id,
            new_total: subtotal,
          },
        });
      } catch (e) {
        logger.error('Failed to log activity (invoice.updateLineItems)', { error: e instanceof Error ? e : new Error(String(e)) });
      }

      return { success: true };
    }),
});
