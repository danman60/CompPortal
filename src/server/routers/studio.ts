import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

export const studioRouter = router({
  // Get all studios
  getAll: publicProcedure.query(async () => {
    const studios = await prisma.studios.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        province: true,
        country: true,
        status: true,
        email: true,
        phone: true,
        created_at: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      studios,
      count: studios.length,
    };
  }),

  // Get a single studio by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const studio = await prisma.studios.findUnique({
        where: { id: input.id },
        include: {
          dancers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              date_of_birth: true,
            },
          },
          _count: {
            select: {
              dancers: true,
              reservations: true,
              competition_entries: true,
            },
          },
        },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      return studio;
    }),

  // Get studios with statistics
  getStats: publicProcedure.query(async () => {
    const [total, pending, approved, withDancers] = await Promise.all([
      prisma.studios.count(),
      prisma.studios.count({ where: { status: 'pending' } }),
      prisma.studios.count({ where: { status: 'approved' } }),
      prisma.studios.count({
        where: {
          dancers: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      withDancers,
    };
  }),

  // Create a new studio
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // For now, using a dummy owner_id - will be replaced with actual auth
      const dummyOwnerId = '00000000-0000-0000-0000-000000000000';

      const studio = await prisma.studios.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          city: input.city,
          province: input.province,
          country: input.country ?? 'Canada',
          owner_id: dummyOwnerId,
          status: 'pending',
        },
      });

      return studio;
    }),
});
