import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

// Validation schema for dancer input
const dancerInputSchema = z.object({
  studio_id: z.string().uuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  date_of_birth: z.string().optional(), // ISO date string
  age_override: z.number().int().min(0).max(150).optional(),
  gender: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  parent_name: z.string().max(255).optional(),
  parent_email: z.string().email().optional().or(z.literal('')),
  parent_phone: z.string().max(50).optional(),
  emergency_contact_name: z.string().max(255).optional(),
  emergency_contact_phone: z.string().max(50).optional(),
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  years_dancing: z.number().int().min(0).max(100).optional(),
  primary_style: z.string().max(100).optional(),
  skill_level: z.string().max(50).optional(),
  previous_competitions: z.number().int().min(0).optional(),
  photo_url: z.string().url().optional().or(z.literal('')),
  waiver_signed: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export const dancerRouter = router({
  // Get all dancers with optional filtering
  getAll: publicProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
          search: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      const { studioId, search, status, limit = 50, offset = 0 } = input;

      const where: any = {};

      if (studioId) {
        where.studio_id = studioId;
      }

      if (search) {
        where.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { registration_number: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      const [dancers, total] = await Promise.all([
        prisma.dancers.findMany({
          where,
          include: {
            studios: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            _count: {
              select: {
                entry_participants: true,
              },
            },
          },
          orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
          take: limit,
          skip: offset,
        }),
        prisma.dancers.count({ where }),
      ]);

      return {
        dancers,
        total,
        limit,
        offset,
        hasMore: offset + dancers.length < total,
      };
    }),

  // Get a single dancer by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const dancer = await prisma.dancers.findUnique({
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
          entry_participants: {
            include: {
              competition_entries: {
                select: {
                  id: true,
                  entry_title: true,
                  competition_id: true,
                  competitions: {
                    select: {
                      name: true,
                      start_date: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!dancer) {
        throw new Error('Dancer not found');
      }

      return dancer;
    }),

  // Get dancers by studio ID
  getByStudio: publicProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ input }) => {
      const dancers = await prisma.dancers.findMany({
        where: { studio_id: input.studioId },
        include: {
          _count: {
            select: {
              entry_participants: true,
            },
          },
        },
        orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
      });

      return {
        dancers,
        count: dancers.length,
      };
    }),

  // Get dancer statistics
  getStats: publicProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ input = {} }) => {
      const where: any = {};

      if (input.studioId) {
        where.studio_id = input.studioId;
      }

      const [total, active, withEntries, byGender] = await Promise.all([
        prisma.dancers.count({ where }),
        prisma.dancers.count({ where: { ...where, status: 'active' } }),
        prisma.dancers.count({
          where: {
            ...where,
            entry_participants: {
              some: {},
            },
          },
        }),
        prisma.dancers.groupBy({
          by: ['gender'],
          where,
          _count: true,
        }),
      ]);

      return {
        total,
        active,
        withEntries,
        byGender: byGender.reduce((acc, item) => {
          acc[item.gender || 'unknown'] = item._count;
          return acc;
        }, {} as Record<string, number>),
      };
    }),

  // Create a new dancer
  create: publicProcedure
    .input(dancerInputSchema)
    .mutation(async ({ input }) => {
      const { date_of_birth, ...data } = input;

      const dancer = await prisma.dancers.create({
        data: {
          ...data,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return dancer;
    }),

  // Update a dancer
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: dancerInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const { date_of_birth, ...data } = input.data;

      const dancer = await prisma.dancers.update({
        where: { id: input.id },
        data: {
          ...data,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
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
        },
      });

      return dancer;
    }),

  // Delete a dancer
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Check if dancer has entries
      const entriesCount = await prisma.entry_participants.count({
        where: { dancer_id: input.id },
      });

      if (entriesCount > 0) {
        throw new Error(
          `Cannot delete dancer with ${entriesCount} competition entries. Archive instead.`
        );
      }

      await prisma.dancers.delete({
        where: { id: input.id },
      });

      return { success: true, message: 'Dancer deleted successfully' };
    }),

  // Archive a dancer (soft delete)
  archive: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const dancer = await prisma.dancers.update({
        where: { id: input.id },
        data: {
          status: 'archived',
          updated_at: new Date(),
        },
      });

      return dancer;
    }),

  // Bulk import dancers (for CSV uploads)
  bulkCreate: publicProcedure
    .input(
      z.object({
        dancers: z.array(dancerInputSchema),
      })
    )
    .mutation(async ({ input }) => {
      const results = await Promise.allSettled(
        input.dancers.map(async (dancerData) => {
          const { date_of_birth, ...data } = dancerData;
          return prisma.dancers.create({
            data: {
              ...data,
              date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
            },
          });
        })
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r: any) => r.reason?.message || 'Unknown error');

      return {
        successful,
        failed,
        total: input.dancers.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),
});
