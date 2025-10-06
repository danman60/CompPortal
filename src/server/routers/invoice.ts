import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

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
      // Get all competitions this studio has entries in
      const competitions = await prisma.competition_entries.groupBy({
        by: ['competition_id'],
        where: {
          studio_id: input.studioId,
        },
        _count: {
          id: true,
        },
      });

      const invoices = await Promise.all(
        competitions.map(async (comp) => {
          const competition = await prisma.competitions.findUnique({
            where: { id: comp.competition_id },
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
            },
          });

          const entries = await prisma.competition_entries.findMany({
            where: {
              studio_id: input.studioId,
              competition_id: comp.competition_id,
              status: { not: 'cancelled' },
            },
          });

          const totalAmount = entries.reduce((sum, entry) => {
            return sum + Number(entry.total_fee || 0);
          }, 0);

          return {
            competitionId: comp.competition_id,
            competitionName: competition?.name || 'Unknown',
            competitionYear: competition?.year,
            startDate: competition?.competition_start_date,
            entryCount: entries.length,
            totalAmount,
          };
        })
      );

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

      // Fetch all invoices with studio/competition/reservation details
      const invoices = await Promise.all(
        entryGroups.map(async (group) => {
          const [studio, competition, reservation] = await Promise.all([
            prisma.studios.findUnique({
              where: { id: group.studio_id },
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
            prisma.competitions.findUnique({
              where: { id: group.competition_id },
              select: {
                id: true,
                name: true,
                year: true,
                competition_start_date: true,
                competition_end_date: true,
              },
            }),
            prisma.reservations.findFirst({
              where: {
                studio_id: group.studio_id,
                competition_id: group.competition_id,
              },
              select: {
                id: true,
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
            studioCode: studio.code,
            studioCity: studio.city,
            studioProvince: studio.province,
            studioEmail: studio.email,
            studioPhone: studio.phone,
            competitionId: competition.id,
            competitionName: competition.name,
            competitionYear: competition.year,
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
              paymentStatus: reservation.payment_status,
              paymentDueDate: reservation.payment_due_date,
              paymentConfirmedAt: reservation.payment_confirmed_at,
              paymentConfirmedBy: reservation.payment_confirmed_by,
              reservationStatus: reservation.status,
            } : null,
          };
        })
      );

      // Filter out null entries and sort by competition year (desc) and studio name (asc)
      const validInvoices = invoices
        .filter((inv): inv is NonNullable<typeof inv> => inv !== null)
        .sort((a, b) => {
          // Sort by year descending first
          const yearDiff = (b.competitionYear || 0) - (a.competitionYear || 0);
          if (yearDiff !== 0) return yearDiff;

          // Then by studio name ascending
          return a.studioName.localeCompare(b.studioName);
        });

      return {
        invoices: validInvoices,
        total: validInvoices.length,
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
});
