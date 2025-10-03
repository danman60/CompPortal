import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

// Validation schema for reservation input
const reservationInputSchema = z.object({
  studio_id: z.string().uuid(),
  competition_id: z.string().uuid(),
  location_id: z.string().uuid().optional(),
  spaces_requested: z.number().int().min(1).max(1000),
  spaces_confirmed: z.number().int().min(0).optional(),
  agent_first_name: z.string().max(100).optional(),
  agent_last_name: z.string().max(100).optional(),
  agent_email: z.string().email().optional().or(z.literal('')),
  agent_phone: z.string().max(50).optional(),
  agent_title: z.string().max(100).optional(),
  age_of_consent: z.boolean().default(false),
  waiver_consent: z.boolean().default(false),
  media_consent: z.boolean().default(false),
  deposit_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  payment_status: z.enum(['pending', 'partial', 'paid', 'refunded', 'cancelled']).default('pending'),
  payment_due_date: z.string().optional(), // ISO date string
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('pending'),
  internal_notes: z.string().optional(),
  public_notes: z.string().optional(),
});

export const reservationRouter = router({
  // Get all reservations with optional filtering
  getAll: publicProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
          competitionId: z.string().uuid().optional(),
          status: z.string().optional(),
          paymentStatus: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      const { studioId, competitionId, status, paymentStatus, limit = 50, offset = 0 } = input;

      const where: any = {};

      if (studioId) {
        where.studio_id = studioId;
      }

      if (competitionId) {
        where.competition_id = competitionId;
      }

      if (status) {
        where.status = status;
      }

      if (paymentStatus) {
        where.payment_status = paymentStatus;
      }

      const [reservations, total, competitions] = await Promise.all([
        prisma.reservations.findMany({
          where,
          include: {
            studios: {
              select: {
                id: true,
                name: true,
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
            competition_locations: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                competition_entries: true,
              },
            },
          },
          orderBy: [
            { requested_at: 'desc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.reservations.count({ where }),
        prisma.competitions.findMany({
          select: {
            id: true,
            name: true,
            year: true,
          },
          orderBy: [
            { year: 'desc' },
            { name: 'asc' },
          ],
        }),
      ]);

      return {
        reservations,
        competitions,
        total,
        limit,
        offset,
        hasMore: offset + reservations.length < total,
      };
    }),

  // Get a single reservation by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.id },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              province: true,
              email: true,
              phone: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
              competition_end_date: true,
              entry_fee: true,
              venue_capacity: true,
            },
          },
          competition_locations: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          competition_entries: {
            select: {
              id: true,
              title: true,
            },
          },
          users: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      return reservation;
    }),

  // Get reservations by studio
  getByStudio: publicProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ input }) => {
      const reservations = await prisma.reservations.findMany({
        where: { studio_id: input.studioId },
        include: {
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
            },
          },
          _count: {
            select: {
              competition_entries: true,
            },
          },
        },
        orderBy: [
          { requested_at: 'desc' },
        ],
      });

      return {
        reservations,
        count: reservations.length,
      };
    }),

  // Get reservations by competition
  getByCompetition: publicProcedure
    .input(z.object({ competitionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const reservations = await prisma.reservations.findMany({
        where: { competition_id: input.competitionId },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              province: true,
            },
          },
          _count: {
            select: {
              competition_entries: true,
            },
          },
        },
        orderBy: [
          { requested_at: 'asc' },
        ],
      });

      // Calculate total spaces
      const totalRequested = reservations.reduce((sum, r) => sum + r.spaces_requested, 0);
      const totalConfirmed = reservations.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0);

      return {
        reservations,
        count: reservations.length,
        totalRequested,
        totalConfirmed,
      };
    }),

  // Get reservation statistics
  getStats: publicProcedure
    .input(
      z
        .object({
          competitionId: z.string().uuid().optional(),
          studioId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      const where: any = {};

      if (input.competitionId) {
        where.competition_id = input.competitionId;
      }

      if (input.studioId) {
        where.studio_id = input.studioId;
      }

      const [
        total,
        pending,
        approved,
        rejected,
        byPaymentStatus,
        totalRequested,
        totalConfirmed,
      ] = await Promise.all([
        prisma.reservations.count({ where }),
        prisma.reservations.count({ where: { ...where, status: 'pending' } }),
        prisma.reservations.count({ where: { ...where, status: 'approved' } }),
        prisma.reservations.count({ where: { ...where, status: 'rejected' } }),
        prisma.reservations.groupBy({
          by: ['payment_status'],
          where,
          _count: true,
        }),
        prisma.reservations.aggregate({
          where,
          _sum: { spaces_requested: true },
        }),
        prisma.reservations.aggregate({
          where,
          _sum: { spaces_confirmed: true },
        }),
      ]);

      return {
        total,
        pending,
        approved,
        rejected,
        byPaymentStatus: byPaymentStatus.reduce((acc, item) => {
          acc[item.payment_status || 'unknown'] = item._count;
          return acc;
        }, {} as Record<string, number>),
        totalRequested: totalRequested._sum.spaces_requested || 0,
        totalConfirmed: totalConfirmed._sum.spaces_confirmed || 0,
      };
    }),

  // Create a new reservation
  create: publicProcedure
    .input(reservationInputSchema)
    .mutation(async ({ input }) => {
      const {
        payment_due_date,
        deposit_amount,
        total_amount,
        ...data
      } = input;

      // Check competition capacity
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competition_id },
        select: {
          id: true,
          name: true,
          venue_capacity: true,
          _count: {
            select: {
              competition_entries: true,
            },
          },
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const currentEntries = competition._count.competition_entries;
      const capacity = competition.venue_capacity || 0;

      if (capacity > 0 && currentEntries + input.spaces_requested > capacity) {
        const available = capacity - currentEntries;
        throw new Error(
          `Not enough space available. Requested: ${input.spaces_requested}, Available: ${available}`
        );
      }

      const reservation = await prisma.reservations.create({
        data: {
          ...data,
          payment_due_date: payment_due_date ? new Date(payment_due_date) : undefined,
          deposit_amount: deposit_amount?.toString(),
          total_amount: total_amount?.toString(),
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
        },
      });

      return reservation;
    }),

  // Update a reservation
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: reservationInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const {
        payment_due_date,
        deposit_amount,
        total_amount,
        ...data
      } = input.data;

      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          ...data,
          payment_due_date: payment_due_date ? new Date(payment_due_date) : undefined,
          deposit_amount: deposit_amount?.toString(),
          total_amount: total_amount?.toString(),
          updated_at: new Date(),
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
        },
      });

      return reservation;
    }),

  // Approve a reservation
  approve: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        spacesConfirmed: z.number().int().min(0).optional(),
        approvedBy: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          status: 'approved',
          spaces_confirmed: input.spacesConfirmed,
          approved_at: new Date(),
          approved_by: input.approvedBy,
          updated_at: new Date(),
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return reservation;
    }),

  // Reject a reservation
  reject: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().optional(),
        rejectedBy: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          status: 'rejected',
          internal_notes: input.reason,
          approved_by: input.rejectedBy,
          updated_at: new Date(),
        },
      });

      return reservation;
    }),

  // Cancel a reservation
  cancel: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          status: 'cancelled',
          updated_at: new Date(),
        },
      });

      return reservation;
    }),

  // Delete a reservation
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Check if reservation has entries
      const entriesCount = await prisma.competition_entries.count({
        where: { reservation_id: input.id },
      });

      if (entriesCount > 0) {
        throw new Error(
          `Cannot delete reservation with ${entriesCount} entries. Cancel instead.`
        );
      }

      await prisma.reservations.delete({
        where: { id: input.id },
      });

      return { success: true, message: 'Reservation deleted successfully' };
    }),
});
