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
          tenant_id: ctx.tenantId!,
          studio_id: input.studioId,
          competition_id: input.competitionId,
          ...(isStudioDirector && {
            status: {
              in: ['SENT', 'PAID'],
            },
          }),
        },
        include: {
          studios: true,
          competitions: true,
          reservations: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!invoice) return null;

      // Transform to match expected format
      const lineItems = Array.isArray(invoice.line_items)
        ? (invoice.line_items as Array<{
            id: string;
            entryNumber: number | null;
            title: string;
            category: string;
            sizeCategory: string;
            participantCount?: number;
            entryFee: number;
            lateFee: number;
            total: number;
          }>).map(item => ({
            ...item,
            participantCount: item.participantCount ?? 0,
          }))
        : [];
      const subtotal = parseFloat(invoice.subtotal?.toString() || '0');
      const creditAmount = Number(invoice.credit_amount || 0);
      const otherCreditAmount = Number(invoice.other_credit_amount || 0);
      const taxRate = parseFloat(invoice.tax_rate?.toString() || '0.13') / 100;
      // Tax is calculated AFTER all credits are applied
      const afterAllCredits = subtotal - creditAmount - otherCreditAmount;
      const taxAmount = afterAllCredits * taxRate;
      const totalAmount = afterAllCredits + taxAmount;

      return {
        id: invoice.id,
        invoiceNumber: `INV-${invoice.competitions?.year}-${invoice.studios?.code || invoice.studios?.id.substring(0, 8) || 'UNKNOWN'}-${invoice.id.substring(0, 8)}`,
        invoiceDate: invoice.created_at || new Date(),
        tenantId: invoice.tenant_id,
        studio: {
          id: invoice.studios?.id || '',
          name: invoice.studios?.name || 'Unknown',
          code: invoice.studios?.code || invoice.studios?.id.substring(0, 8) || 'N/A',
          address1: invoice.studios?.address1,
          address2: invoice.studios?.address2,
          city: invoice.studios?.city,
          province: invoice.studios?.province,
          postal_code: invoice.studios?.postal_code,
          country: invoice.studios?.country,
          email: invoice.studios?.email,
          phone: invoice.studios?.phone,
        },
        competition: {
          id: invoice.competitions?.id || '',
          name: invoice.competitions?.name || 'Unknown',
          year: invoice.competitions?.year || new Date().getFullYear(),
          startDate: invoice.competitions?.competition_start_date,
          endDate: invoice.competitions?.competition_end_date,
          location: invoice.competitions?.primary_location,
        },
        reservation: invoice.reservations ? {
          id: invoice.reservations.id,
          spacesRequested: invoice.reservations.spaces_requested,
          spacesConfirmed: invoice.reservations.spaces_confirmed || 0,
          depositAmount: Number(invoice.reservations.deposit_amount || 0),
          totalAmount: Number(invoice.reservations.total_amount || 0),
          paymentStatus: invoice.reservations.payment_status,
        } : null,
        lineItems,
        summary: {
          entryCount: lineItems.length,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          creditAmount,
          creditReason: invoice.credit_reason,
          otherCreditAmount,
          otherCreditReason: invoice.other_credit_reason,
        },
        status: invoice.status,
        paidAt: invoice.paid_at,
        isLocked: invoice.is_locked,
        credit_amount: invoice.credit_amount,
        credit_reason: invoice.credit_reason,
        other_credit_amount: invoice.other_credit_amount,
        other_credit_reason: invoice.other_credit_reason,
      };
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
            tenant_id: ctx.tenantId!,
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

      // Fetch all non-cancelled entries for this studio in this competition
      const entries = await prisma.competition_entries.findMany({
        where: {
          studio_id: studioId,
          competition_id: competitionId,
          status: { not: 'cancelled' },
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
      const taxRate = 0.13; // Hardcoded 13% HST as per requirements
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
        invoiceNumber: `INV-${competition.year}-${studio.code || studio.id.substring(0, 8)}-${Date.now()}`,
        invoiceDate: new Date(),
        tenantId: studio.tenant_id,
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
          creditAmount: 0,
          creditReason: null,
        },
      };
    }),

  // Get all invoices for a studio
  getByStudio: publicProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Studio Directors can only see SENT or PAID invoices
      // Competition Directors and Super Admins can see all invoices
      const isStudioDirector = ctx.userRole === 'studio_director';

      // Query actual invoices table (not just entries)
      const dbInvoices = await prisma.invoices.findMany({
        where: {
          tenant_id: ctx.tenantId!,
          studio_id: input.studioId,
          ...(isStudioDirector && {
            status: {
              in: ['SENT', 'PAID'],
            },
          }),
        },
        include: {
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Transform to match expected format
      const invoices = dbInvoices.map(inv => {
        const lineItems = Array.isArray(inv.line_items) ? inv.line_items : [];
        return {
          competitionId: inv.competition_id,
          competitionName: inv.competitions?.name || 'Unknown',
          competitionYear: inv.competitions?.year,
          startDate: inv.competitions?.competition_start_date,
          entryCount: lineItems.length,
          totalAmount: parseFloat(inv.total?.toString() || '0'),
          status: inv.status,
          paidAt: inv.paid_at,
          invoiceStatus: inv.status,
          invoiceCreatedAt: inv.created_at,
        };
      });

      return { invoices };
    }),

  // Get all invoices across all studios and competitions (Competition Directors only)
  getAllInvoices: protectedProcedure
    .input(
      z.object({
        competitionId: z.string().uuid().optional(),
        paymentStatus: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { competitionId, paymentStatus } = input ?? {};

      // Super Admin gets cross-tenant invoices, others get tenant-filtered
      const isSuperAdmin = ctx.userRole === 'super_admin';
      const whereClause = isSuperAdmin ? {} : { tenant_id: ctx.tenantId! };

      // PERFORMANCE FIX: Fetch all data in bulk instead of N+1 queries
      // Get all studio × competition combinations with entries
      const entryGroups = await prisma.competition_entries.groupBy({
        by: ['studio_id', 'competition_id'],
        where: {
          ...whereClause,
          status: { not: 'cancelled' },
          ...(competitionId && { competition_id: competitionId }),
        },
        _count: { id: true },
        _sum: { total_fee: true },
      });

      // Fetch ALL invoices first to get complete studio+competition list
      const allInvoices = await prisma.invoices.findMany({
        where: {
          ...whereClause,
          ...(competitionId && { competition_id: competitionId }),
        },
        select: {
          id: true,
          studio_id: true,
          competition_id: true,
          status: true,
          created_at: true,
        },
      });

      // Extract unique studio and competition IDs from BOTH entries AND invoices
      const studioIdsFromEntries = entryGroups.map(g => g.studio_id);
      const studioIdsFromInvoices = allInvoices.map(inv => inv.studio_id);
      const studioIds = [...new Set([...studioIdsFromEntries, ...studioIdsFromInvoices])];

      const competitionIdsFromEntries = entryGroups.map(g => g.competition_id);
      const competitionIdsFromInvoices = allInvoices.map(inv => inv.competition_id);
      const competitionIds = [...new Set([...competitionIdsFromEntries, ...competitionIdsFromInvoices])];

      // Fetch all studios, competitions, and reservations in parallel (invoices already fetched)
      const [studios, competitions, reservations] = await Promise.all([
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
      ]);

      // Use allInvoices (already fetched above)
      const invoices = allInvoices;

      // Create maps for fast lookup
      const studioMap = new Map(studios.map(s => [s.id, s]));
      const competitionMap = new Map(competitions.map(c => [c.id, c]));
      const reservationMap = new Map<string, typeof reservations[0]>();
      reservations.forEach(r => {
        reservationMap.set(`${r.studio_id}::${r.competition_id}`, r);
      });
      const invoiceMap = new Map<string, typeof invoices[0]>();
      invoices.forEach(inv => {
        invoiceMap.set(`${inv.studio_id}::${inv.competition_id}`, inv);
      });

      // Create entry group map for fast lookup
      const entryGroupMap = new Map<string, typeof entryGroups[0]>();
      entryGroups.forEach(group => {
        entryGroupMap.set(`${group.studio_id}::${group.competition_id}`, group);
      });

      // DEBUG: Log data for troubleshooting
      console.log('[getAllInvoices] Data Summary:', {
        entryGroupsCount: entryGroups.length,
        invoicesCount: invoices.length,
        studiosCount: studios.length,
        competitionsCount: competitions.length,
        studioIds,
        competitionIds,
        allCombinationsCount: new Set([
          ...entryGroups.map(g => `${g.studio_id}::${g.competition_id}`),
          ...invoices.map(inv => `${inv.studio_id}::${inv.competition_id}`)
        ]).size,
      });

      // Get all unique studio+competition combinations from BOTH invoices and entries
      const allCombinations = new Set<string>();
      entryGroups.forEach(group => allCombinations.add(`${group.studio_id}::${group.competition_id}`));
      invoices.forEach(inv => allCombinations.add(`${inv.studio_id}::${inv.competition_id}`));

      // Build invoices from all combinations (entries + invoices)
      const summaries = Array.from(allCombinations)
        .map((key) => {
          const [studio_id, competition_id] = key.split('::');
          const group = entryGroupMap.get(key);
          const studio = studioMap.get(studio_id!);
          const competition = competitionMap.get(competition_id!);
          const reservation = reservationMap.get(key);
          const existingInvoice = invoiceMap.get(key);

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
            entryCount: group?._count.id || 0,
            totalAmount: Number(group?._sum.total_fee || 0),
            hasInvoice: !!existingInvoice,
            invoiceId: existingInvoice?.id || null,
            invoiceStatus: existingInvoice?.status || null,
            invoiceCreatedAt: existingInvoice?.created_at || null,
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
        .filter((inv): inv is NonNullable<typeof inv> => inv !== null && inv.hasInvoice)
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
    .mutation(async ({ ctx, input }) => {
      const { studioId, competitionId } = input;

      // Find the invoice for this studio/competition
      const invoice = await prisma.invoices.findFirst({
        where: {
          tenant_id: ctx.tenantId!,
          studio_id: studioId,
          competition_id: competitionId,
        },
        orderBy: {
          created_at: 'desc', // Get most recent invoice
        },
      });

      if (!invoice) {
        throw new Error('Item not found - it may have been deleted');
      }

      // Get studio and competition details with tenant subdomain
      const studio = await prisma.studios.findFirst({
        where: {
          id: studioId,
          tenant_id: ctx.tenantId!,
        },
        select: {
          owner_id: true,
          name: true,
          email: true,
          tenants: {
            select: {
              subdomain: true,
            },
          },
        },
      });

      const competition = await prisma.competitions.findFirst({
        where: {
          id: competitionId,
          tenant_id: ctx.tenantId!,
        },
        select: {
          name: true,
          year: true,
        },
      });

      if (!studio || !competition || !studio.email || !studio.tenants) {
        throw new Error('Studio or competition not found');
      }

      // Check if email is enabled for this studio owner
      const isEnabled = await isEmailEnabled(studio.owner_id!, 'invoice_received');

      if (!isEnabled) {
        return { success: true, email: studio.email, emailDisabled: true };
      }

      // Get actual invoice data
      const lineItems = (invoice.line_items as any) || [];
      const routineCount = Array.isArray(lineItems) ? lineItems.length : 0;
      // Use amount_due (total - deposit) instead of raw total
      const totalAmount = Number(invoice.amount_due || invoice.total || 0);

      // Build tenant-specific URL
      const baseUrl = `https://${studio.tenants.subdomain}.compsync.net`;

      const emailData: InvoiceDeliveryData = {
        studioName: studio.name,
        competitionName: competition.name,
        competitionYear: competition.year || new Date().getFullYear(),
        invoiceNumber: invoice.id.substring(0, 8),
        totalAmount,
        routineCount,
        invoiceUrl: `${baseUrl}/dashboard/invoices/${invoice.id}/${invoice.competition_id}`,
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
        templateType: 'invoice-delivery',
        studioId: invoice.studio_id,
        competitionId: invoice.competition_id,
      });

      logger.info('Invoice reminder sent', {
        email: studio.email,
        competition: `${competition.name} ${competition.year}`,
        amount: totalAmount.toFixed(2),
      });

      return { success: true, email: studio.email };
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

      console.log('[INVOICE_GEN] Starting invoice generation:', {
        reservation_id: reservationId,
        user_id: ctx.userId,
        tenant_id: ctx.tenantId,
        spaces_confirmed: spacesConfirmed
      });

      const reservation = await prisma.reservations.findUnique({
        where: { id: reservationId },
        include: { studios: true, competitions: true },
      });

      if (!reservation) throw new Error('Reservation not found');

      console.log('[INVOICE_GEN] Reservation loaded:', {
        studio_id: reservation.studio_id,
        studio_name: reservation.studios.name,
        competition_id: reservation.competition_id,
        competition_name: reservation.competitions.name,
        status: reservation.status
      });

      // 🛡️ GUARD: Validate reservation is in summarized state
      if (reservation.status !== 'summarized') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot create invoice: reservation must be in 'summarized' state (current: ${reservation.status}). Please submit summary first.`
        });
      }

      // 🛡️ GUARD: Check for existing invoice
      const existingInvoice = await prisma.invoices.findFirst({
        where: {
          tenant_id: ctx.tenantId!,
          studio_id: reservation.studio_id,
          competition_id: reservation.competition_id,
          reservation_id: reservationId,
        },
      });

      if (existingInvoice) {
        throw new Error('Invoice already exists for this reservation');
      }

      // Build line items from all entries for this reservation (summary was already validated)
      console.log('[INVOICE_CALC] Fetching entries for invoice generation:', {
        reservation_id: reservationId,
        tenant_id: ctx.tenantId
      });

      const entries = await prisma.competition_entries.findMany({
        where: {
          reservation_id: reservationId,
          status: { notIn: ['cancelled', 'withdrawn'] }, // Exclude cancelled and withdrawn entries
        },
        include: {
          dance_categories: true,
          entry_size_categories: true,
          entry_participants: true,
        },
        orderBy: { entry_number: 'asc' },
      });

      console.log('[INVOICE_CALC] Entries loaded:', {
        entries_count: entries.length,
        entry_ids: entries.map(e => e.id),
        entry_numbers: entries.map(e => e.entry_number),
        entry_titles: entries.map(e => e.title)
      });

      // 🛡️ GUARD: Must have entries to create invoice
      if (entries.length === 0) {
        console.error('[INVOICE_CALC] No entries found - cannot create invoice');
        throw new Error('Cannot create invoice: no entries submitted yet');
      }

      const lineItems = entries.map((entry) => ({
        id: entry.id,
        entryNumber: entry.entry_number,
        title: entry.title,
        category: entry.dance_categories?.name || 'Unknown',
        sizeCategory: entry.entry_size_categories?.name || 'Unknown',
        participantCount: entry.entry_participants?.length || 0,
        entryFee: Number(entry.entry_fee || 0),
        lateFee: Number(entry.late_fee || 0),
        total: Number(entry.entry_fee || 0) + Number(entry.late_fee || 0),
      }));

      console.log('[INVOICE_CALC] Line items calculated:', {
        line_items_count: lineItems.length,
        line_items: lineItems.map(li => ({
          entry_number: li.entryNumber,
          title: li.title,
          entry_fee: li.entryFee,
          late_fee: li.lateFee,
          total: li.total
        }))
      });

      const subtotal = lineItems.reduce((sum, i) => sum + i.total, 0);

      // Calculate tax (13% HST)
      const taxRate = 13.00;
      const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
      const total = Number((subtotal + taxAmount).toFixed(2));

      // Calculate deposit deduction and amount due (CD feature)
      const depositAmount = Number(reservation.deposit_amount || 0);
      const amountDue = Number((total - depositAmount).toFixed(2));

      console.log('[INVOICE_CALC] Invoice totals calculated:', {
        line_items_count: lineItems.length,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        deposit_amount: depositAmount,
        amount_due: amountDue
      });

      // 🔐 TRANSACTION: Wrap invoice creation + reservation update for atomicity
      console.log('[INVOICE_GEN] Starting transaction for invoice creation');

      const invoice = await prisma.$transaction(async (tx) => {
        // Create invoice record with DRAFT status (not visible to studio yet)
        console.log('[INVOICE_GEN] Creating invoice record:', {
          tenant_id: reservation.tenant_id,
          studio_id: reservation.studio_id,
          competition_id: reservation.competition_id,
          reservation_id: reservationId,
          subtotal,
          tax_rate: taxRate,
          total,
          status: 'DRAFT'
        });

        const newInvoice = await tx.invoices.create({
          data: {
            tenant_id: reservation.tenant_id,
            studio_id: reservation.studio_id,
            competition_id: reservation.competition_id,
            reservation_id: reservationId,
            line_items: lineItems as any,
            subtotal,
            tax_rate: taxRate,
            total,
            deposit_amount: depositAmount,
            amount_due: amountDue,
            status: 'DRAFT',
          },
        });

        console.log('[INVOICE_GEN] Invoice created successfully:', {
          invoice_id: newInvoice.id,
          status: newInvoice.status
        });

        // Mark reservation as invoiced (Phase 1 spec: summarized → invoiced)
        console.log('[INVOICE_GEN] Updating reservation status to invoiced:', {
          reservation_id: reservationId,
          old_status: reservation.status,
          new_status: 'invoiced',
          spaces_confirmed: spacesConfirmed ?? reservation.spaces_requested
        });

        await tx.reservations.update({
          where: { id: reservationId },
          data: {
            status: 'invoiced',
            spaces_confirmed: spacesConfirmed ?? reservation.spaces_requested,
            updated_at: new Date(),
          },
        });

        console.log('[INVOICE_GEN] Reservation updated successfully');

        return newInvoice;
      });

      console.log('[INVOICE_GEN] Transaction completed successfully:', {
        invoice_id: invoice.id,
        reservation_id: reservationId,
        total: invoice.total
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

      if (invoice.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot access invoice from another tenant' });
      }

      if (invoice.status !== 'DRAFT') {
        throw new Error('Can only send invoices with DRAFT status');
      }

      const updatedInvoice = await prisma.invoices.update({
        where: { id: input.invoiceId },
        data: {
          status: 'SENT',
          is_locked: true, // Lock invoice after sending to prevent unauthorized edits
          updated_at: new Date(),
        },
      });

      // Activity log (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          tenantId: ctx.tenantId ?? undefined,
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
          select: {
            owner_id: true,
            name: true,
            email: true,
            tenants: { select: { subdomain: true } },
          },
        });

        const competition = await prisma.competitions.findUnique({
          where: { id: updatedInvoice.competition_id },
          select: { name: true, year: true },
        });

        if (studio?.owner_id && studio?.email && competition) {
          const isEnabled = await isEmailEnabled(studio.owner_id, 'invoice_received');

          if (isEnabled) {
            // Get actual invoice data
            const lineItems = (updatedInvoice.line_items as any) || [];
            const routineCount = Array.isArray(lineItems) ? lineItems.length : 0;
            // Use amount_due (total - deposit) instead of raw total
            const totalAmount = Number(updatedInvoice.amount_due || updatedInvoice.total || 0);

            const baseUrl = `https://${studio.tenants.subdomain}.compsync.net`;
            const emailData: InvoiceDeliveryData = {
              studioName: studio.name,
              competitionName: competition.name,
              competitionYear: competition.year || new Date().getFullYear(),
              invoiceNumber: updatedInvoice.id.substring(0, 8),
              totalAmount,
              routineCount,
              invoiceUrl: `${baseUrl}/dashboard/invoices/${updatedInvoice.id}/${updatedInvoice.competition_id}`,
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
              templateType: 'invoice-delivery',
              studioId: updatedInvoice.studio_id,
              competitionId: updatedInvoice.competition_id,
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

      if (invoice.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot access invoice from another tenant' });
      }

      if (invoice.status === 'PAID') {
        throw new Error('Invoice is already paid');
      }

      // 🔐 TRANSACTION: Wrap invoice update + reservation update for atomicity
      await prisma.$transaction(async (tx) => {
        // Update invoice to PAID status and lock it
        await tx.invoices.update({
          where: { id: input.invoiceId },
          data: {
            status: 'PAID',
            is_locked: true, // Lock invoice when marked as paid
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
              amount: Number(invoice.total) || 0,
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
              templateType: 'payment-confirmed',
              studioId: invoice.studio_id,
              competitionId: invoice.competition_id,
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

  // Apply or remove discount (Competition Directors only)
  applyDiscount: protectedProcedure
    .input(z.object({
      invoiceId: z.string().uuid(),
      discountPercentage: z.number().min(0).max(100), // 0 to remove discount
    }))
    .mutation(async ({ ctx, input }) => {
      // 🔐 CRITICAL: Only Competition Directors and Super Admins can apply discounts
      if (ctx.userRole === 'studio_director') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can apply discounts to invoices.',
        });
      }

      const invoice = await prisma.invoices.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot access invoice from another tenant' });
      }

      const subtotal = Number(invoice.subtotal);
      const taxRate = Number(invoice.tax_rate);

      // Calculate discount amount
      const discountAmount = input.discountPercentage > 0
        ? (subtotal * input.discountPercentage) / 100
        : 0;

      // Calculate new total: (subtotal - discount) * (1 + taxRate/100)
      const afterDiscount = subtotal - discountAmount;
      const newTotal = afterDiscount * (1 + taxRate / 100);

      // Recalculate amount_due with deposit (CRITICAL: must update when total changes)
      const depositAmount = Number(invoice.deposit_amount || 0);
      const newAmountDue = Number((newTotal - depositAmount).toFixed(2));

      // Update invoice with discount AND amount_due
      await prisma.invoices.update({
        where: { id: input.invoiceId },
        data: {
          credit_amount: discountAmount,
          credit_reason: input.discountPercentage > 0
            ? `${input.discountPercentage}% studio discount`
            : null,
          total: newTotal,
          amount_due: newAmountDue,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        discountAmount,
        newTotal,
      };
    }),

  // Apply or remove custom credit (Competition Directors only)
  // This is for fixed dollar credits (separate from percentage discounts)
  applyCustomCredit: protectedProcedure
    .input(z.object({
      invoiceId: z.string().uuid(),
      creditAmount: z.number().min(0), // Dollar amount, 0 to remove
      creditReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 🔐 CRITICAL: Only Competition Directors and Super Admins can apply credits
      if (ctx.userRole === 'studio_director') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can apply credits to invoices.',
        });
      }

      const invoice = await prisma.invoices.findUnique({
        where: { id: input.invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot access invoice from another tenant' });
      }

      const subtotal = Number(invoice.subtotal);
      const taxRate = Number(invoice.tax_rate);
      const existingCreditAmount = Number(invoice.credit_amount || 0); // Percentage discount

      // Calculate new total: (subtotal - percentage_discount - other_credit) * (1 + taxRate/100)
      const afterAllCredits = subtotal - existingCreditAmount - input.creditAmount;
      const taxAmount = afterAllCredits * (taxRate / 100);
      const newTotal = afterAllCredits + taxAmount;

      // Recalculate amount_due with deposit (CRITICAL: must update when total changes)
      const depositAmount = Number(invoice.deposit_amount || 0);
      const newAmountDue = Number((newTotal - depositAmount).toFixed(2));

      // Update invoice with other_credit AND amount_due
      await prisma.invoices.update({
        where: { id: input.invoiceId },
        data: {
          other_credit_amount: input.creditAmount,
          other_credit_reason: input.creditAmount > 0
            ? (input.creditReason || 'Custom credit')
            : null,
          total: newTotal,
          amount_due: newAmountDue,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        creditAmount: input.creditAmount,
        newTotal,
      };
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

      if (invoice.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot access invoice from another tenant' });
      }

      // 🛡️ GUARD: Prevent editing locked invoices
      if (invoice.is_locked) {
        throw new Error('Cannot edit locked invoice. Invoice is locked after being sent.');
      }

      // 🛡️ GUARD: Only allow edits when status is DRAFT or SENT (not PAID)
      guardInvoiceStatus(
        invoice.status as 'DRAFT' | 'SENT' | 'PAID',
        ['DRAFT', 'SENT'],
        'edit invoice prices'
      );

      // Recalculate subtotal and total from line items
      const subtotal = input.lineItems.reduce((sum, item) => sum + item.total, 0);

      // Apply tax and discount (if any) to get correct total
      const creditAmount = Number(invoice.credit_amount || 0);
      const taxRate = Number(invoice.tax_rate || 13) / 100;
      const afterDiscount = subtotal - creditAmount;
      const newTotal = Number((afterDiscount * (1 + taxRate)).toFixed(2));

      // Recalculate amount_due with deposit (CRITICAL: must update when total changes)
      const depositAmount = Number(invoice.deposit_amount || 0);
      const newAmountDue = Number((newTotal - depositAmount).toFixed(2));

      await prisma.invoices.update({
        where: { id: input.invoiceId },
        data: {
          line_items: input.lineItems as any,
          subtotal,
          total: newTotal,
          amount_due: newAmountDue,
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

  /**
   * Split invoice into family-specific sub-invoices
   * Calculates per-family costs based on dancer participation in entries
   */
  splitInvoice: protectedProcedure
    .input(z.object({
      invoiceId: z.string().uuid(),
      margin: z.object({
        type: z.enum(['percentage_per_routine', 'fixed_per_routine', 'percentage_per_dancer', 'fixed_per_dancer']),
        value: z.number().min(0), // No negative margin
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('[SUBINVOICE_SPLIT] Starting invoice split:', {
        invoice_id: input.invoiceId,
        user_id: ctx.userId,
        user_role: ctx.userRole,
        tenant_id: ctx.tenantId
      });

      // 1. Fetch main invoice with validation
      const invoice = await prisma.invoices.findUnique({
        where: { id: input.invoiceId, tenant_id: ctx.tenantId! },
        include: {
          studios: true,
          competitions: true,
        },
      });

      if (!invoice) {
        console.error('[SUBINVOICE_SPLIT] Invoice not found:', input.invoiceId);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      console.log('[SUBINVOICE_SPLIT] Invoice loaded:', {
        invoice_id: invoice.id,
        studio_id: invoice.studio_id,
        studio_name: invoice.studios.name,
        competition_id: invoice.competition_id,
        competition_name: invoice.competitions.name,
        status: invoice.status,
        total: invoice.total
      });

      // Guard: Must be studio owner or super admin
      if (ctx.userRole !== 'super_admin' && invoice.studios.owner_id !== ctx.userId) {
        console.error('[SUBINVOICE_SPLIT] Unauthorized split attempt:', {
          user_id: ctx.userId,
          studio_owner_id: invoice.studios.owner_id
        });
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to split this invoice' });
      }

      // Guard: Invoice must be PAID before splitting
      if (invoice.status !== 'PAID') {
        console.error('[SUBINVOICE_SPLIT] Invoice not paid yet:', {
          status: invoice.status,
          invoice_id: invoice.id
        });
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invoice must be marked as PAID before splitting by dancer. This ensures the Competition Director has finalized all pricing.'
        });
      }

      // 2. Get all entries for this invoice (from line_items)
      const lineItems = invoice.line_items as any[];
      const entryIds = lineItems.map((item: any) => item.id);

      console.log('[SUBINVOICE_SPLIT] Extracting entries from invoice:', {
        line_items_count: lineItems.length,
        entry_ids: entryIds
      });

      if (entryIds.length === 0) {
        console.error('[SUBINVOICE_SPLIT] No entries found in invoice line items');
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice has no entries to split' });
      }

      // 3. Fetch entries with participants and dancer details
      const entries = await prisma.competition_entries.findMany({
        where: {
          id: { in: entryIds },
          tenant_id: ctx.tenantId!,
          status: { not: 'cancelled' },
        },
        include: {
          entry_participants: {
            include: {
              dancers: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  parent_email: true,
                  parent_name: true,
                },
              },
            },
          },
          dance_categories: { select: { name: true } },
          entry_size_categories: { select: { name: true } },
        },
      });

      console.log('[SUBINVOICE_SPLIT] Entries with participants loaded:', {
        entries_count: entries.length,
        total_participants: entries.reduce((sum, e) => sum + e.entry_participants.length, 0),
        entries_detail: entries.map(e => ({
          entry_id: e.id,
          entry_number: e.entry_number,
          title: e.title,
          total_fee: e.total_fee,
          participants_count: e.entry_participants.length,
          dancers: e.entry_participants.map(ep => `${ep.dancers.first_name} ${ep.dancers.last_name}`)
        }))
      });

      // 4. Create one sub-invoice per dancer
      console.log('[SUBINVOICE_SPLIT] Building dancer-level sub-invoices');

      type DancerData = {
        dancer_id: string;
        dancer_name: string;
        parent_email: string | null;
        lineItems: any[];
        subtotal: number;
      };

      const dancerMap = new Map<string, DancerData>();

      entries.forEach(entry => {
        const totalDancers = entry.entry_participants.length;
        const entryTotal = Number(entry.total_fee || 0);
        const sharePerDancer = entryTotal / totalDancers;

        console.log('[SUBINVOICE_SPLIT] Processing entry for split:', {
          entry_id: entry.id,
          entry_number: entry.entry_number,
          title: entry.title,
          entry_total: entryTotal,
          total_dancers: totalDancers,
          share_per_dancer: sharePerDancer
        });

        // Find corresponding line item from invoice
        const invoiceLineItem = lineItems.find((li: any) => li.id === entry.id);
        const entryNumber = invoiceLineItem?.entryNumber || entry.entry_number || '—';

        // Calculate share for each dancer in this entry
        entry.entry_participants.forEach(ep => {
          const dancerId = ep.dancer_id;
          const dancerName = `${ep.dancers.first_name} ${ep.dancers.last_name}`;
          const parentEmail = ep.dancers.parent_email;

          if (!dancerMap.has(dancerId)) {
            console.log('[SUBINVOICE_SPLIT] Creating new dancer entry in map:', {
              dancer_id: dancerId,
              dancer_name: dancerName,
              parent_email: parentEmail
            });

            dancerMap.set(dancerId, {
              dancer_id: dancerId,
              dancer_name: dancerName,
              parent_email: parentEmail,
              lineItems: [],
              subtotal: 0,
            });
          }

          const dancerData = dancerMap.get(dancerId)!;
          dancerData.lineItems.push({
            entry_id: entry.id,
            entry_number: entryNumber,
            title: entry.title,
            category: entry.dance_categories?.name || 'Unknown',
            size_category: entry.entry_size_categories?.name || 'Unknown',
            dancer_ids: [dancerId],
            dancer_names: [dancerName],
            total_dancers: totalDancers,
            dancer_share: sharePerDancer,
            amount: Number(sharePerDancer.toFixed(2)),
          });
          dancerData.subtotal += Number(sharePerDancer.toFixed(2));

          console.log('[SUBINVOICE_SPLIT] Added line item to dancer:', {
            dancer_id: dancerId,
            dancer_name: dancerName,
            entry_title: entry.title,
            dancer_share: sharePerDancer,
            new_subtotal: dancerData.subtotal
          });
        });
      });

      console.log('[SUBINVOICE_SPLIT] Dancer map built:', {
        unique_dancers: dancerMap.size,
        dancers: Array.from(dancerMap.values()).map(d => ({
          dancer_id: d.dancer_id,
          dancer_name: d.dancer_name,
          entries_count: d.lineItems.length,
          subtotal: d.subtotal
        }))
      });

      // 5. Apply margin if provided
      const marginConfig = input.margin;
      console.log('[SUBINVOICE_MARGIN] Margin configuration:', {
        has_margin: !!marginConfig,
        margin_type: marginConfig?.type,
        margin_value: marginConfig?.value
      });

      const dancers = Array.from(dancerMap.values());
      dancers.forEach((dancer) => {
        const originalSubtotal = dancer.subtotal;
        let marginAmount = 0;
        let adjustedSubtotal = originalSubtotal;

        if (marginConfig) {
          if (marginConfig.type === 'percentage_per_routine') {
            // Apply percentage margin to each routine
            dancer.lineItems = dancer.lineItems.map(item => {
              const itemMargin = item.amount * (marginConfig.value / 100);
              const itemWithMargin = item.amount + itemMargin;
              marginAmount += itemMargin;
              return { ...item, amount: Number(itemWithMargin.toFixed(2)) };
            });
            // Recalculate subtotal from adjusted line items
            adjustedSubtotal = dancer.lineItems.reduce((sum: number, item: any) => sum + item.amount, 0);
          }
          else if (marginConfig.type === 'fixed_per_routine') {
            // Add fixed dollar to each routine
            const routineCount = dancer.lineItems.length;
            marginAmount = marginConfig.value * routineCount;
            dancer.lineItems = dancer.lineItems.map(item => ({
              ...item,
              amount: Number((item.amount + marginConfig.value).toFixed(2))
            }));
            adjustedSubtotal = originalSubtotal + marginAmount;
          }
          else if (marginConfig.type === 'percentage_per_dancer') {
            // Apply percentage to total dancer subtotal, distribute proportionally across routines
            marginAmount = originalSubtotal * (marginConfig.value / 100);
            const marginRatio = marginAmount / originalSubtotal;
            dancer.lineItems = dancer.lineItems.map(item => {
              const itemMargin = item.amount * marginRatio;
              return { ...item, amount: Number((item.amount + itemMargin).toFixed(2)) };
            });
            adjustedSubtotal = originalSubtotal + marginAmount;
          }
          else if (marginConfig.type === 'fixed_per_dancer') {
            // Add fixed dollar per dancer, distribute proportionally across routines
            marginAmount = marginConfig.value;
            const marginRatio = marginAmount / originalSubtotal;
            dancer.lineItems = dancer.lineItems.map(item => {
              const itemMargin = item.amount * marginRatio;
              return { ...item, amount: Number((item.amount + itemMargin).toFixed(2)) };
            });
            adjustedSubtotal = originalSubtotal + marginAmount;
          }
        }

        // Store margin data for dancer
        (dancer as any).original_subtotal = originalSubtotal;
        (dancer as any).margin_amount = marginAmount;
        (dancer as any).margin_type = marginConfig?.type || null;
        (dancer as any).margin_value = marginConfig?.value || null;
        dancer.subtotal = Number(adjustedSubtotal.toFixed(2));

        console.log('[SUBINVOICE_MARGIN] Dancer margin applied:', {
          dancer_id: dancer.dancer_id,
          dancer_name: dancer.dancer_name,
          original_subtotal: originalSubtotal,
          margin_amount: marginAmount,
          adjusted_subtotal: dancer.subtotal
        });
      });

      // 6. Calculate tax for each dancer
      const taxRate = Number(invoice.tax_rate || 13);

      console.log('[SUBINVOICE_VALIDATE] Calculating tax and totals:', {
        tax_rate: taxRate,
        dancers_count: dancers.length,
        invoice_total: invoice.total,
        has_margin: !!marginConfig
      });

      let calculatedTotal = 0;
      dancers.forEach((dancer, index) => {
        const taxAmount = Number((dancer.subtotal * taxRate / 100).toFixed(2));
        const total = dancer.subtotal + taxAmount;

        // Store for rounding adjustment check
        calculatedTotal += total;

        (dancer as any).tax_rate = taxRate;
        (dancer as any).tax_amount = taxAmount;
        (dancer as any).total = total;

        console.log('[SUBINVOICE_VALIDATE] Dancer totals calculated:', {
          dancer_id: dancer.dancer_id,
          dancer_name: dancer.dancer_name,
          subtotal: dancer.subtotal,
          tax_amount: taxAmount,
          total
        });
      });

      // 7. Apply penny rounding adjustment to last dancer alphabetically (Decision #6)
      const mainInvoiceTotal = Number(invoice.total);

      // When margin is applied, dancer invoices will total MORE than main invoice
      // Only validate rounding if NO margin, otherwise expect difference
      if (!marginConfig) {
        const difference = mainInvoiceTotal - calculatedTotal;

        console.log('[SUBINVOICE_VALIDATE] Checking totals match (no margin):', {
          main_invoice_total: mainInvoiceTotal,
          calculated_total: calculatedTotal,
          difference,
          acceptable: Math.abs(difference) <= 0.01
        });

        if (Math.abs(difference) > 0.01) {
          console.error('[SUBINVOICE_VALIDATE] Split calculation error - difference too large:', {
            main_invoice_total: mainInvoiceTotal,
            calculated_total: calculatedTotal,
            difference
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Split calculation error: difference of $${difference.toFixed(2)}`,
          });
        }

        if (difference !== 0) {
          // Sort dancers alphabetically and apply adjustment to last one
          const sortedDancers = [...dancers].sort((a, b) => a.dancer_name.localeCompare(b.dancer_name));
          const lastDancer: any = sortedDancers[sortedDancers.length - 1];
          const oldTotal = lastDancer.total;
          lastDancer.total = Number((lastDancer.total + difference).toFixed(2));

          console.log('[SUBINVOICE_VALIDATE] Applied rounding adjustment to last dancer alphabetically:', {
            dancer_id: lastDancer.dancer_id,
            dancer_name: lastDancer.dancer_name,
            old_total: oldTotal,
            adjustment: difference,
            new_total: lastDancer.total
          });
        }
      } else {
        console.log('[SUBINVOICE_VALIDATE] Margin applied - dancer invoices total will exceed main invoice:', {
          main_invoice_total: mainInvoiceTotal,
          calculated_dancer_total: calculatedTotal,
          total_margin: calculatedTotal - mainInvoiceTotal
        });
      }

      // 7. Delete existing sub-invoices for this invoice (allow regeneration)
      console.log('[SUBINVOICE_CREATE] Deleting existing sub-invoices for regeneration:', {
        parent_invoice_id: input.invoiceId
      });

      const deleted = await prisma.sub_invoices.deleteMany({
        where: {
          parent_invoice_id: input.invoiceId,
          tenant_id: ctx.tenantId!,
        },
      });

      console.log('[SUBINVOICE_CREATE] Deleted existing sub-invoices:', {
        count: deleted.count
      });

      // 8. Create sub-invoices in transaction (one per dancer)
      console.log('[SUBINVOICE_CREATE] Creating sub-invoices in transaction:', {
        dancers_count: dancers.length
      });

      const subInvoices = await prisma.$transaction(
        dancers.map((dancer: any) => {
          console.log('[SUBINVOICE_CREATE] Creating sub-invoice for dancer:', {
            dancer_id: dancer.dancer_id,
            dancer_name: dancer.dancer_name,
            subtotal: dancer.subtotal,
            tax_amount: dancer.tax_amount,
            total: dancer.total,
            line_items_count: dancer.lineItems.length
          });

          return prisma.sub_invoices.create({
            data: {
              parent_invoice_id: input.invoiceId,
              dancer_id: dancer.dancer_id,
              dancer_name: dancer.dancer_name,
              line_items: dancer.lineItems as any,
              subtotal: dancer.subtotal,
              tax_rate: dancer.tax_rate,
              tax_amount: dancer.tax_amount,
              total: dancer.total,
              status: 'GENERATED',
              margin_type: dancer.margin_type,
              margin_value: dancer.margin_value,
              margin_amount: dancer.margin_amount,
              original_subtotal: dancer.original_subtotal,
              tenant_id: ctx.tenantId!,
              notes: dancer.parent_email ? `Parent email: ${dancer.parent_email}` : null,
            },
          });
        })
      );

      console.log('[SUBINVOICE_CREATE] Sub-invoices created successfully:', {
        count: subInvoices.length,
        sub_invoice_ids: subInvoices.map(si => si.id),
        total_sum: subInvoices.reduce((sum, si) => sum + Number(si.total), 0)
      });

      // 9. Update main invoice with margin tracking
      const totalMargin = dancers.reduce((sum, d: any) => sum + (d.margin_amount || 0), 0);
      await prisma.invoices.update({
        where: { id: input.invoiceId },
        data: {
          has_dancer_invoices: true,
          total_margin_applied: totalMargin > 0 ? totalMargin : null,
        },
      });

      console.log('[SUBINVOICE_CREATE] Main invoice updated with margin tracking:', {
        invoice_id: input.invoiceId,
        has_dancer_invoices: true,
        total_margin: totalMargin
      });

      // 10. Activity log
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: invoice.studio_id,
          action: 'invoice.split',
          entityType: 'invoice',
          entityId: invoice.id,
          details: {
            sub_invoice_count: subInvoices.length,
            total_verified: subInvoices.reduce((sum, si) => sum + Number(si.total), 0) === mainInvoiceTotal,
          },
        });
      } catch (e) {
        logger.error('Failed to log activity (invoice.split)', { error: e instanceof Error ? e : new Error(String(e)) });
      }

      return {
        success: true,
        sub_invoice_count: subInvoices.length,
        total_margin: totalMargin,
        main_invoice_total: mainInvoiceTotal,
        dancer_invoices_total: calculatedTotal,
        dancers: dancers.map((d: any) => ({
          name: d.dancer_name,
          identifier: d.dancer_id,
          routines_count: d.lineItems.length,
          original_total: d.original_subtotal + (d.original_subtotal * taxRate / 100),
          final_total: d.total,
          margin: d.margin_amount || 0,
        })),
      };
    }),

  /**
   * Get all sub-invoices for a parent invoice
   */
  getSubInvoices: protectedProcedure
    .input(z.object({
      parentInvoiceId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const invoice = await prisma.invoices.findUnique({
        where: { id: input.parentInvoiceId, tenant_id: ctx.tenantId! },
        include: { studios: true },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      // Guard: Must be studio owner or super admin
      if (ctx.userRole !== 'super_admin' && invoice.studios.owner_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const subInvoices = await prisma.sub_invoices.findMany({
        where: {
          parent_invoice_id: input.parentInvoiceId,
          tenant_id: ctx.tenantId!,
        },
        orderBy: { dancer_name: 'asc' },
      });

      // Calculate summary
      const totalSum = subInvoices.reduce((sum, si) => sum + Number(si.total), 0);
      const matchesParent = Math.abs(totalSum - Number(invoice.total)) < 0.01;

      return {
        sub_invoices: subInvoices,
        summary: {
          count: subInvoices.length,
          total: totalSum,
          matches_parent: matchesParent,
          parent_total: Number(invoice.total),
        },
      };
    }),

  /**
   * Get single sub-invoice by ID
   */
  getSubInvoiceById: protectedProcedure
    .input(z.object({
      subInvoiceId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const subInvoice = await prisma.sub_invoices.findUnique({
        where: {
          id: input.subInvoiceId,
          tenant_id: ctx.tenantId!,
        },
        include: {
          invoices: {
            include: {
              studios: true,
              competitions: true,
            },
          },
        },
      });

      if (!subInvoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sub-invoice not found' });
      }

      // Guard: Must be studio owner or super admin
      if (ctx.userRole !== 'super_admin' && subInvoice.invoices.studios.owner_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return subInvoice;
    }),

  /**
   * Delete all sub-invoices for a parent invoice (for regeneration)
   */
  deleteSubInvoices: protectedProcedure
    .input(z.object({
      parentInvoiceId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await prisma.invoices.findUnique({
        where: { id: input.parentInvoiceId, tenant_id: ctx.tenantId! },
        include: { studios: true },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      // Guard: Must be studio owner or super admin
      if (ctx.userRole !== 'super_admin' && invoice.studios.owner_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const result = await prisma.sub_invoices.deleteMany({
        where: {
          parent_invoice_id: input.parentInvoiceId,
          tenant_id: ctx.tenantId!,
        },
      });

      // Activity log
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: invoice.studio_id,
          action: 'invoice.deleteSubInvoices',
          entityType: 'invoice',
          entityId: invoice.id,
          details: { deleted_count: result.count },
        });
      } catch (e) {
        logger.error('Failed to log activity (invoice.deleteSubInvoices)', { error: e instanceof Error ? e : new Error(String(e)) });
      }

      return { success: true, deleted_count: result.count };
    }),

  /**
   * Get invoice with entries for split wizard preview
   */
  getInvoiceWithEntries: protectedProcedure
    .input(z.object({
      invoiceId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const invoice = await prisma.invoices.findUnique({
        where: { id: input.invoiceId, tenant_id: ctx.tenantId! },
        include: {
          studios: true,
          competitions: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      // Guard: Must be studio owner or super admin
      if (ctx.userRole !== 'super_admin' && invoice.studios.owner_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Get entry IDs from line items
      const lineItems = invoice.line_items as any[];
      const entryIds = lineItems.map((item: any) => item.id);

      // Fetch entries with participants
      const entries = await prisma.competition_entries.findMany({
        where: {
          id: { in: entryIds },
          tenant_id: ctx.tenantId!,
          status: { not: 'cancelled' },
        },
        include: {
          entry_participants: {
            include: {
              dancers: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  parent_email: true,
                },
              },
            },
          },
          entry_size_categories: { select: { name: true } },
        },
      });

      return {
        invoice,
        entries,
      };
    }),

  /**
   * Get sub-invoice details for PDF generation
   * Fetches all data needed to render a dancer's invoice PDF
   */
  getSubInvoiceDetails: protectedProcedure
    .input(z.object({
      subInvoiceId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Fetch sub-invoice with all related data
      const subInvoice = await prisma.sub_invoices.findUnique({
        where: {
          id: input.subInvoiceId,
          tenant_id: ctx.tenantId!,
        },
        include: {
          invoices: {
            include: {
              studios: true,
              competitions: true,
            },
          },
        },
      });

      if (!subInvoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Sub-invoice not found' });
      }

      // Validate access
      if (subInvoice.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot access sub-invoice from another tenant' });
      }

      // Fetch tenant branding
      const tenant = await prisma.tenants.findUnique({
        where: { id: ctx.tenantId! },
        select: {
          branding: true,
        },
      });

      // Parse line items from JSON
      const lineItems = (subInvoice.line_items as any) || [];
      const parsedLineItems = Array.isArray(lineItems) ? lineItems.map((item: any) => ({
        entry_number: item.entry_number || 0,
        title: item.title || '',
        amount: Number(item.amount || 0),
        late_fee: Number(item.late_fee || 0),
      })) : [];

      // Build invoice number from parent invoice
      const parentInvoice = subInvoice.invoices;
      const studio = parentInvoice.studios;
      const competition = parentInvoice.competitions;
      const invoiceNumber = `INV-${competition.year}-${studio.code || studio.id.substring(0, 8)}-${parentInvoice.id.substring(0, 8)}`;

      return {
        subInvoice: {
          id: subInvoice.id,
          dancer_name: subInvoice.dancer_name,
          dancer_id: subInvoice.dancer_id,
          line_items: parsedLineItems,
          subtotal: Number(subInvoice.subtotal || 0),
          tax_rate: Number(subInvoice.tax_rate || 0),
          tax_amount: Number(subInvoice.tax_amount || 0),
          total: Number(subInvoice.total || 0),
        },
        competition: {
          name: competition.name,
          year: competition.year || new Date().getFullYear(),
          startDate: competition.competition_start_date?.toISOString() || new Date().toISOString(),
          endDate: competition.competition_end_date?.toISOString(),
          location: competition.primary_location || undefined,
        },
        studio: {
          name: studio.name,
          code: studio.code || undefined,
          email: studio.email || undefined,
          phone: studio.phone || undefined,
          address1: studio.address1 || undefined,
          city: studio.city || undefined,
          province: studio.province || undefined,
          postal_code: studio.postal_code || undefined,
        },
        invoiceNumber,
        invoiceDate: parentInvoice.created_at || new Date(),
        tenant: tenant ? {
          branding: tenant.branding as any,
        } : undefined,
      };
    }),

  /**
   * Send dancer invoice emails with PDF attachments
   * Manual email sending triggered by studio owner (Step 4 of split invoice wizard)
   */
  sendDancerInvoiceEmails: protectedProcedure
    .input(z.object({
      parentInvoiceId: z.string().uuid(),
      emails: z.array(z.object({
        subInvoiceId: z.string().uuid(),
        dancerName: z.string(),
        emailAddress: z.string().email(),
      })),
      emailSubject: z.string(),
      emailBody: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('[DANCER_EMAIL] Starting dancer invoice email send:', {
        parent_invoice_id: input.parentInvoiceId,
        emails_count: input.emails.length,
        user_id: ctx.userId,
        tenant_id: ctx.tenantId,
      });

      // Validate access to parent invoice
      const parentInvoice = await prisma.invoices.findUnique({
        where: { id: input.parentInvoiceId, tenant_id: ctx.tenantId! },
        include: { studios: true },
      });

      if (!parentInvoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent invoice not found' });
      }

      // Guard: Must be studio owner or super admin
      if (ctx.userRole !== 'super_admin' && parentInvoice.studios.owner_id !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to send emails for this invoice' });
      }

      let sent = 0;
      let failed = 0;
      const errors: Array<{ dancerName: string; error: string }> = [];

      // Process each email
      for (const emailData of input.emails) {
        try {
          console.log('[DANCER_EMAIL] Processing email for dancer:', {
            dancer_name: emailData.dancerName,
            email: emailData.emailAddress,
            sub_invoice_id: emailData.subInvoiceId,
          });

          // Fetch sub-invoice details (reuse existing logic)
          const subInvoice = await prisma.sub_invoices.findUnique({
            where: {
              id: emailData.subInvoiceId,
              tenant_id: ctx.tenantId!,
            },
            include: {
              invoices: {
                include: {
                  studios: true,
                  competitions: true,
                },
              },
            },
          });

          if (!subInvoice) {
            throw new Error('Sub-invoice not found');
          }

          if (subInvoice.parent_invoice_id !== input.parentInvoiceId) {
            throw new Error('Sub-invoice does not belong to parent invoice');
          }

          // TODO: Generate PDF attachment
          // For now, we'll send without PDF attachment
          // PDF generation will be implemented in frontend using react-pdf or similar
          console.log('[DANCER_EMAIL] PDF generation not yet implemented - sending email without attachment');

          // Replace [Dancer Name] placeholder in email body
          const personalizedBody = input.emailBody.replace(/\[Dancer Name\]/g, emailData.dancerName);

          // Send email
          await sendEmail({
            to: emailData.emailAddress,
            subject: input.emailSubject,
            html: personalizedBody,
            templateType: 'dancer-invoice',
            studioId: parentInvoice.studio_id,
            competitionId: parentInvoice.competition_id,
          });

          console.log('[DANCER_EMAIL] Email sent successfully:', {
            dancer_name: emailData.dancerName,
            email: emailData.emailAddress,
          });

          sent++;
        } catch (error) {
          console.error('[DANCER_EMAIL] Failed to send email:', {
            dancer_name: emailData.dancerName,
            email: emailData.emailAddress,
            error: error instanceof Error ? error.message : String(error),
          });

          failed++;
          errors.push({
            dancerName: emailData.dancerName,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Activity log
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: parentInvoice.studio_id,
          action: 'invoice.sendDancerEmails',
          entityType: 'invoice',
          entityId: input.parentInvoiceId,
          details: {
            sent,
            failed,
            total: input.emails.length,
          },
        });
      } catch (e) {
        logger.error('Failed to log activity (invoice.sendDancerEmails)', { error: e instanceof Error ? e : new Error(String(e)) });
      }

      console.log('[DANCER_EMAIL] Email sending completed:', {
        sent,
        failed,
        total: input.emails.length,
      });

      return {
        success: failed === 0,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),
});
