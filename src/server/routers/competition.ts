import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

// Validation schema for competition input
const competitionInputSchema = z.object({
  name: z.string().min(1).max(255),
  year: z.number().int().min(2000).max(2100),
  description: z.string().optional(),
  registration_opens: z.string().optional(), // ISO datetime string
  registration_closes: z.string().optional(),
  competition_start_date: z.string().optional(), // ISO date string
  competition_end_date: z.string().optional(),
  primary_location: z.string().max(255).optional(),
  venue_address: z.string().optional(),
  venue_capacity: z.number().int().min(0).optional(),
  session_count: z.number().int().min(1).default(1),
  number_of_judges: z.number().int().min(1).default(3),
  entry_fee: z.number().min(0).optional(),
  late_fee: z.number().min(0).optional(),
  allow_age_overrides: z.boolean().default(true),
  allow_multiple_entries: z.boolean().default(true),
  require_video_submissions: z.boolean().default(false),
  status: z.enum(['upcoming', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled']).default('upcoming'),
  is_public: z.boolean().default(true),
  logo_url: z.string().url().optional().or(z.literal('')),
  website: z.string().url().max(255).optional().or(z.literal('')),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional(),
  rules_document_url: z.string().url().optional().or(z.literal('')),
});

export const competitionRouter = router({
  // Get all competitions with optional filtering
  getAll: publicProcedure
    .input(
      z
        .object({
          year: z.number().int().optional(),
          status: z.string().optional(),
          isPublic: z.boolean().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      const { year, status, isPublic, limit = 50, offset = 0 } = input;

      const where: any = {};

      if (year) {
        where.year = year;
      }

      if (status) {
        where.status = status;
      }

      if (isPublic !== undefined) {
        where.is_public = isPublic;
      }

      const [competitions, total] = await Promise.all([
        prisma.competitions.findMany({
          where,
          include: {
            _count: {
              select: {
                competition_entries: true,
                reservations: true,
                judges: true,
                competition_sessions: true,
              },
            },
            reservations: {
              select: {
                id: true,
                status: true,
                spaces_requested: true,
                spaces_confirmed: true,
                studio_id: true,
                studios: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { competition_start_date: 'desc' },
            { name: 'asc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.competitions.count({ where }),
      ]);

      return {
        competitions,
        total,
        limit,
        offset,
        hasMore: offset + competitions.length < total,
      };
    }),

  // Get a single competition by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const competition = await prisma.competitions.findUnique({
        where: { id: input.id },
        include: {
          competition_sessions: {
            orderBy: { session_number: 'asc' },
          },
          competition_locations: {
            orderBy: { name: 'asc' },
          },
          judges: {
            orderBy: { judge_number: 'asc' },
          },
          _count: {
            select: {
              competition_entries: true,
              reservations: true,
              awards: true,
            },
          },
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      return competition;
    }),

  // Get competition statistics
  getStats: publicProcedure
    .input(
      z
        .object({
          competitionId: z.string().uuid().optional(),
          year: z.number().int().optional(),
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      const where: any = {};

      if (input.competitionId) {
        where.id = input.competitionId;
      }

      if (input.year) {
        where.year = input.year;
      }

      const [total, byStatus, byYear] = await Promise.all([
        prisma.competitions.count({ where }),
        prisma.competitions.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.competitions.groupBy({
          by: ['year'],
          where,
          _count: true,
          orderBy: { year: 'desc' },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status || 'unknown'] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byYear: byYear.map((item) => ({
          year: item.year,
          count: item._count,
        })),
      };
    }),

  // Get upcoming competitions
  getUpcoming: publicProcedure.query(async () => {
    const now = new Date();

    const competitions = await prisma.competitions.findMany({
      where: {
        is_public: true,
        OR: [
          {
            competition_start_date: {
              gte: now,
            },
          },
          {
            status: {
              in: ['upcoming', 'registration_open'],
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            competition_entries: true,
            reservations: true,
          },
        },
      },
      orderBy: {
        competition_start_date: 'asc',
      },
      take: 10,
    });

    return {
      competitions,
      count: competitions.length,
    };
  }),

  // Create a new competition
  create: publicProcedure
    .input(competitionInputSchema)
    .mutation(async ({ input }) => {
      const {
        registration_opens,
        registration_closes,
        competition_start_date,
        competition_end_date,
        entry_fee,
        late_fee,
        ...data
      } = input;

      const competition = await prisma.competitions.create({
        data: {
          ...data,
          registration_opens: registration_opens
            ? new Date(registration_opens)
            : undefined,
          registration_closes: registration_closes
            ? new Date(registration_closes)
            : undefined,
          competition_start_date: competition_start_date
            ? new Date(competition_start_date)
            : undefined,
          competition_end_date: competition_end_date
            ? new Date(competition_end_date)
            : undefined,
          entry_fee: entry_fee?.toString(),
          late_fee: late_fee?.toString(),
        },
        include: {
          _count: {
            select: {
              competition_entries: true,
              reservations: true,
            },
          },
        },
      });

      return competition;
    }),

  // Update a competition
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: competitionInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const {
        registration_opens,
        registration_closes,
        competition_start_date,
        competition_end_date,
        entry_fee,
        late_fee,
        ...data
      } = input.data;

      const competition = await prisma.competitions.update({
        where: { id: input.id },
        data: {
          ...data,
          registration_opens: registration_opens
            ? new Date(registration_opens)
            : undefined,
          registration_closes: registration_closes
            ? new Date(registration_closes)
            : undefined,
          competition_start_date: competition_start_date
            ? new Date(competition_start_date)
            : undefined,
          competition_end_date: competition_end_date
            ? new Date(competition_end_date)
            : undefined,
          entry_fee: entry_fee?.toString(),
          late_fee: late_fee?.toString(),
          updated_at: new Date(),
        },
        include: {
          _count: {
            select: {
              competition_entries: true,
              reservations: true,
            },
          },
        },
      });

      return competition;
    }),

  // Delete a competition
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Check if competition has entries
      const entriesCount = await prisma.competition_entries.count({
        where: { competition_id: input.id },
      });

      if (entriesCount > 0) {
        throw new Error(
          `Cannot delete competition with ${entriesCount} entries. Cancel instead.`
        );
      }

      // Check if competition has reservations
      const reservationsCount = await prisma.reservations.count({
        where: { competition_id: input.id },
      });

      if (reservationsCount > 0) {
        throw new Error(
          `Cannot delete competition with ${reservationsCount} reservations. Cancel instead.`
        );
      }

      await prisma.competitions.delete({
        where: { id: input.id },
      });

      return { success: true, message: 'Competition deleted successfully' };
    }),

  // Cancel a competition (soft delete)
  cancel: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const competition = await prisma.competitions.update({
        where: { id: input.id },
        data: {
          status: 'cancelled',
          updated_at: new Date(),
        },
      });

      return competition;
    }),

  // Get competition capacity and availability
  getCapacity: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const competition = await prisma.competitions.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          venue_capacity: true,
          _count: {
            select: {
              competition_entries: true,
              reservations: true,
            },
          },
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const totalEntries = competition._count.competition_entries;
      const totalReservations = competition._count.reservations;
      const capacity = competition.venue_capacity || 0;
      const availableSpots = capacity - totalEntries;
      const utilizationPercent = capacity > 0 ? (totalEntries / capacity) * 100 : 0;

      return {
        competitionId: competition.id,
        competitionName: competition.name,
        capacity,
        totalEntries,
        totalReservations,
        availableSpots: Math.max(0, availableSpots),
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        isFull: capacity > 0 && totalEntries >= capacity,
        nearCapacity: utilizationPercent >= 90,
      };
    }),
});
