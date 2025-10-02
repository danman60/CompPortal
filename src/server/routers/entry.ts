import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

// Validation schema for entry participant
const entryParticipantSchema = z.object({
  dancer_id: z.string().uuid(),
  dancer_name: z.string().max(255),
  dancer_age: z.number().int().min(0).optional(),
  role: z.string().max(100).optional(),
  display_order: z.number().int().min(0).optional(),
  costume_size: z.string().max(20).optional(),
  special_needs: z.string().optional(),
});

// Validation schema for entry input
const entryInputSchema = z.object({
  competition_id: z.string().uuid(),
  reservation_id: z.string().uuid().optional(),
  studio_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  category_id: z.string().uuid(),
  classification_id: z.string().uuid(),
  age_group_id: z.string().uuid(),
  entry_size_category_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  performance_date: z.string().optional(), // ISO date string
  performance_time: z.string().optional(), // ISO time string
  duration: z.string().optional(), // Duration in format "HH:MM:SS"
  warm_up_time: z.string().optional(), // ISO time string
  heat: z.string().max(50).optional(),
  running_order: z.number().int().min(0).optional(),
  is_title_upgrade: z.boolean().default(false),
  is_title_interview: z.boolean().default(false),
  is_improvisation: z.boolean().default(false),
  is_glow_off_round: z.boolean().default(false),
  is_overall_competition: z.boolean().default(false),
  music_title: z.string().max(255).optional(),
  music_artist: z.string().max(255).optional(),
  music_file_url: z.string().url().optional().or(z.literal('')),
  special_requirements: z.string().optional(),
  entry_fee: z.number().min(0).optional(),
  late_fee: z.number().min(0).default(0),
  total_fee: z.number().min(0).optional(),
  status: z.enum(['draft', 'registered', 'confirmed', 'cancelled', 'completed']).default('draft'),
  choreographer: z.string().max(255).optional(),
  costume_description: z.string().optional(),
  props_required: z.string().optional(),
  accessibility_needs: z.string().optional(),
  participants: z.array(entryParticipantSchema).optional(),
});

export const entryRouter = router({
  // Get all entries with optional filtering
  getAll: publicProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
          competitionId: z.string().uuid().optional(),
          reservationId: z.string().uuid().optional(),
          status: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      const { studioId, competitionId, reservationId, status, limit = 50, offset = 0 } = input;

      const where: any = {};

      if (studioId) {
        where.studio_id = studioId;
      }

      if (competitionId) {
        where.competition_id = competitionId;
      }

      if (reservationId) {
        where.reservation_id = reservationId;
      }

      if (status) {
        where.status = status;
      }

      const [entries, total] = await Promise.all([
        prisma.competition_entries.findMany({
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
              },
            },
            entry_participants: {
              include: {
                dancers: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    date_of_birth: true,
                  },
                },
              },
              orderBy: { display_order: 'asc' },
            },
            age_groups: {
              select: {
                id: true,
                name: true,
              },
            },
            dance_categories: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { entry_number: 'asc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.competition_entries.count({ where }),
      ]);

      return {
        entries,
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
      };
    }),

  // Get a single entry by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.id },
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
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
            },
          },
          reservations: {
            select: {
              id: true,
              spaces_requested: true,
              spaces_confirmed: true,
              status: true,
            },
          },
          entry_participants: {
            include: {
              dancers: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  date_of_birth: true,
                  email: true,
                  phone: true,
                },
              },
            },
            orderBy: { display_order: 'asc' },
          },
          age_groups: true,
          dance_categories: true,
          classifications: true,
          entry_size_categories: true,
          competition_sessions: true,
        },
      });

      if (!entry) {
        throw new Error('Entry not found');
      }

      return entry;
    }),

  // Get entries by studio
  getByStudio: publicProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ input }) => {
      const entries = await prisma.competition_entries.findMany({
        where: { studio_id: input.studioId },
        include: {
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
          entry_participants: {
            select: {
              id: true,
              dancer_name: true,
            },
          },
          _count: {
            select: {
              entry_participants: true,
            },
          },
        },
        orderBy: [
          { entry_number: 'asc' },
        ],
      });

      return {
        entries,
        count: entries.length,
      };
    }),

  // Get entry statistics
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

      const [total, byStatus, totalFees] = await Promise.all([
        prisma.competition_entries.count({ where }),
        prisma.competition_entries.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.competition_entries.aggregate({
          where,
          _sum: {
            entry_fee: true,
            late_fee: true,
            total_fee: true,
          },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status || 'unknown'] = item._count;
          return acc;
        }, {} as Record<string, number>),
        totalEntryFees: totalFees._sum.entry_fee || 0,
        totalLateFees: totalFees._sum.late_fee || 0,
        totalFees: totalFees._sum.total_fee || 0,
      };
    }),

  // Create a new entry with participants
  create: publicProcedure
    .input(entryInputSchema)
    .mutation(async ({ input }) => {
      const {
        performance_date,
        performance_time,
        warm_up_time,
        entry_fee,
        late_fee,
        total_fee,
        participants,
        ...data
      } = input;

      // Validate reservation capacity if reservation_id provided
      if (input.reservation_id) {
        const reservation = await prisma.reservations.findUnique({
          where: { id: input.reservation_id },
          include: {
            _count: {
              select: {
                competition_entries: true,
              },
            },
          },
        });

        if (!reservation) {
          throw new Error('Reservation not found');
        }

        const currentEntries = reservation._count.competition_entries;
        const confirmedSpaces = reservation.spaces_confirmed || 0;

        if (currentEntries >= confirmedSpaces) {
          throw new Error(
            `Reservation capacity exceeded. Confirmed: ${confirmedSpaces}, Current: ${currentEntries}`
          );
        }
      }

      // Create entry with participants
      const entry = await prisma.competition_entries.create({
        data: {
          ...data,
          performance_date: performance_date ? new Date(performance_date) : undefined,
          performance_time: performance_time ? new Date(`1970-01-01T${performance_time}`) : undefined,
          warm_up_time: warm_up_time ? new Date(`1970-01-01T${warm_up_time}`) : undefined,
          entry_fee: entry_fee?.toString(),
          late_fee: late_fee?.toString(),
          total_fee: total_fee?.toString(),
          entry_participants: participants
            ? {
                create: participants.map((p) => ({
                  dancer_id: p.dancer_id,
                  dancer_name: p.dancer_name,
                  dancer_age: p.dancer_age,
                  role: p.role,
                  display_order: p.display_order,
                  costume_size: p.costume_size,
                  special_needs: p.special_needs,
                })),
              }
            : undefined,
        },
        include: {
          entry_participants: {
            include: {
              dancers: true,
            },
          },
          studios: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return entry;
    }),

  // Update an entry
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: entryInputSchema.partial().omit({ participants: true }),
      })
    )
    .mutation(async ({ input }) => {
      const {
        performance_date,
        performance_time,
        warm_up_time,
        entry_fee,
        late_fee,
        total_fee,
        ...data
      } = input.data;

      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          ...data,
          performance_date: performance_date ? new Date(performance_date) : undefined,
          performance_time: performance_time ? new Date(`1970-01-01T${performance_time}`) : undefined,
          warm_up_time: warm_up_time ? new Date(`1970-01-01T${warm_up_time}`) : undefined,
          entry_fee: entry_fee?.toString(),
          late_fee: late_fee?.toString(),
          total_fee: total_fee?.toString(),
          updated_at: new Date(),
        },
        include: {
          entry_participants: {
            include: {
              dancers: true,
            },
          },
        },
      });

      return entry;
    }),

  // Add participant to entry
  addParticipant: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        participant: entryParticipantSchema,
      })
    )
    .mutation(async ({ input }) => {
      const participant = await prisma.entry_participants.create({
        data: {
          entry_id: input.entryId,
          dancer_id: input.participant.dancer_id,
          dancer_name: input.participant.dancer_name,
          dancer_age: input.participant.dancer_age,
          role: input.participant.role,
          display_order: input.participant.display_order,
          costume_size: input.participant.costume_size,
          special_needs: input.participant.special_needs,
        },
        include: {
          dancers: true,
        },
      });

      return participant;
    }),

  // Remove participant from entry
  removeParticipant: publicProcedure
    .input(
      z.object({
        participantId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.entry_participants.delete({
        where: { id: input.participantId },
      });

      return { success: true, message: 'Participant removed successfully' };
    }),

  // Delete an entry
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Delete entry (participants will cascade delete)
      await prisma.competition_entries.delete({
        where: { id: input.id },
      });

      return { success: true, message: 'Entry deleted successfully' };
    }),

  // Cancel an entry
  cancel: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          status: 'cancelled',
          updated_at: new Date(),
        },
      });

      return entry;
    }),

  // Confirm an entry (draft -> registered)
  confirm: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          status: 'confirmed',
          updated_at: new Date(),
        },
      });

      return entry;
    }),
});
