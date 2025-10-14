import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export const invoiceRouter = router({
  // Generate invoice for a studio's entries in a competition
  generateForStudio: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
        competitionId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const { studioId, competitionId } = input;

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
      const taxRate = 0; // No tax for now, can be configured per jurisdiction
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
        invoiceNumber: `INV-${competition.year}-${studio.code}-${Date.now()}`,
        invoiceDate: new Date(),
        studio: {
          id: studio.id,
          name: studio.name,
          code: studio.code,
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
    .query(async ({ input = {} }) => {
      const { competitionId, paymentStatus } = input;

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

      // Fetch all studios, competitions, and reservations in parallel
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

      // Create maps for fast lookup
      const studioMap = new Map(studios.map(s => [s.id, s]));
      const competitionMap = new Map(competitions.map(c => [c.id, c]));
      const reservationMap = new Map<string, typeof reservations[0]>();
      reservations.forEach(r => {
        reservationMap.set(`${r.studio_id}-${r.competition_id}`, r);
      });

      // Build invoices from grouped data
      const invoices = entryGroups
        .map((group) => {
          const studio = studioMap.get(group.studio_id);
          const competition = competitionMap.get(group.competition_id);
          const reservation = reservationMap.get(`${group.studio_id}-${group.competition_id}`);

          // Skip if studio or competition not found
          if (!studio || !competition) {
            return null;
          }

          // Apply payment status filter
          if (paymentStatus && reservation?.payment_status !== paymentStatus) {
            return null;
          }

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
        invoices,
        total: invoices.length,
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
      console.log(`Invoice reminder sent to ${studio.contact_email} for ${competition.name} ${competition.year} - $${totalAmount.toFixed(2)}`);

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

      // Create invoice record
      const invoice = await prisma.invoices.create({
        data: {
          tenant_id: reservation.tenant_id,
          studio_id: reservation.studio_id,
          competition_id: reservation.competition_id,
          reservation_id: reservationId,
          line_items: lineItems as any,
          subtotal,
          total: subtotal,
          status: 'UNPAID',
        },
      });

      // Mark reservation approved and set confirmed spaces
      await prisma.reservations.update({
        where: { id: reservationId },
        data: {
          status: 'approved',
          spaces_confirmed: spacesConfirmed ?? reservation.spaces_requested,
          approved_at: new Date(),
          approved_by: ctx.userId,
          updated_at: new Date(),
        },
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
        console.error('Failed to log activity (invoice.create):', e);
      }

      return { invoiceId: invoice.id };
    }),
});
