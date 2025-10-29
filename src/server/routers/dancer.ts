import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { isStudioDirector } from '@/lib/permissions';
import { logger } from '@/lib/logger';

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
  // Get all dancers with optional filtering (role-based)
  getAll: protectedProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
          search: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().int().min(1).max(1000).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .nullish()
    )
    .query(async ({ ctx, input }) => {
      const { studioId, search, status, limit = 50, offset = 0 } = input ?? {};

      const where: any = {};

      // Studio directors can only see their own studio's dancers
      if (isStudioDirector(ctx.userRole) && ctx.studioId) {
        where.studio_id = ctx.studioId;
      } else if (studioId) {
        // Admins can filter by studioId if provided
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
                  title: true,
                  competition_id: true,
                  competitions: {
                    select: {
                      name: true,
                      competition_start_date: true,
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

  // Get dancer statistics (role-based)
  getStats: protectedProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
        })
        .nullish()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      // Studio directors can only see their own studio's stats
      if (isStudioDirector(ctx.userRole) && ctx.studioId) {
        where.studio_id = ctx.studioId;
      } else if (input?.studioId) {
        // Admins can filter by studioId if provided
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

  // Create a new dancer (role-based)
  create: protectedProcedure
    .input(dancerInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { date_of_birth, ...data } = input;

      // Studio directors can only create dancers for their own studio
      if (isStudioDirector(ctx.userRole)) {
        // If ctx.studioId is not available (due to tRPC context gap),
        // fetch it from the database using user ID
        let userStudioId = ctx.studioId;

        if (!userStudioId && ctx.userId) {
          // Try to find user's studio by owner_id
          const userStudio = await prisma.studios.findFirst({
            where: {
              owner_id: ctx.userId,
            },
            select: { id: true },
          });
          if (userStudio) {
            userStudioId = userStudio.id;
          }
        }

        if (!userStudioId) {
          throw new Error('Studio director must have an associated studio');
        }
        if (data.studio_id !== userStudioId) {
          throw new Error('Cannot create dancers for other studios');
        }
      }

      const dancer = await prisma.dancers.create({
        data: {
          ...data,
          tenant_id: ctx.tenantId!,
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

      // Activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: ctx.studioId || input.studio_id,
          action: 'dancer.create',
          entityType: 'dancer',
          entityId: dancer.id,
          details: {
            first_name: dancer.first_name,
            last_name: dancer.last_name,
            studio_id: dancer.studio_id,
            date_of_birth: dancer.date_of_birth,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (dancer.create)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return dancer;
    }),

  // Update a dancer (role-based)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: dancerInputSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { date_of_birth, ...data } = input.data;

      // Studio directors can only update dancers from their own studio
      if (isStudioDirector(ctx.userRole)) {
        // If ctx.studioId is not available (due to tRPC context gap),
        // fetch it from the database using user ID
        let userStudioId = ctx.studioId;

        if (!userStudioId && ctx.userId) {
          // Try to find user's studio by owner_id
          const userStudio = await prisma.studios.findFirst({
            where: {
              owner_id: ctx.userId,
            },
            select: { id: true },
          });
          if (userStudio) {
            userStudioId = userStudio.id;
          }
        }

        if (!userStudioId) {
          throw new Error('Studio director must have an associated studio');
        }

        const existingDancer = await prisma.dancers.findUnique({
          where: { id: input.id },
          select: { studio_id: true },
        });

        if (!existingDancer) {
          throw new Error('Dancer not found');
        }

        if (existingDancer.studio_id !== userStudioId) {
          throw new Error('Cannot update dancers from other studios');
        }

        // Prevent changing studio_id to another studio
        if (data.studio_id && data.studio_id !== userStudioId) {
          throw new Error('Cannot transfer dancers to other studios');
        }
      }

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

  // Delete a dancer (role-based)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Studio directors can only delete dancers from their own studio
      if (isStudioDirector(ctx.userRole)) {
        // If ctx.studioId is not available (due to tRPC context gap),
        // fetch it from the database using user ID
        let userStudioId = ctx.studioId;

        if (!userStudioId && ctx.userId) {
          // Try to find user's studio by owner_id
          const userStudio = await prisma.studios.findFirst({
            where: {
              owner_id: ctx.userId,
            },
            select: { id: true },
          });
          if (userStudio) {
            userStudioId = userStudio.id;
          }
        }

        if (!userStudioId) {
          throw new Error('Studio director must have an associated studio');
        }

        const existingDancer = await prisma.dancers.findUnique({
          where: { id: input.id },
          select: { studio_id: true },
        });

        if (!existingDancer) {
          throw new Error('Dancer not found');
        }

        if (existingDancer.studio_id !== userStudioId) {
          throw new Error('Cannot delete dancers from other studios');
        }
      }

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
  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Studio directors can only archive dancers from their own studio
      if (isStudioDirector(ctx.userRole)) {
        // If ctx.studioId is not available (due to tRPC context gap),
        // fetch it from the database using user ID
        let userStudioId = ctx.studioId;

        if (!userStudioId && ctx.userId) {
          // Try to find user's studio by owner_id
          const userStudio = await prisma.studios.findFirst({
            where: {
              owner_id: ctx.userId,
            },
            select: { id: true },
          });
          if (userStudio) {
            userStudioId = userStudio.id;
          }
        }

        if (!userStudioId) {
          throw new Error('Studio director must have an associated studio');
        }

        const existingDancer = await prisma.dancers.findUnique({
          where: { id: input.id },
          select: { studio_id: true },
        });

        if (!existingDancer) {
          throw new Error('Dancer not found');
        }

        if (existingDancer.studio_id !== userStudioId) {
          throw new Error('Cannot archive dancers from other studios');
        }
      }

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
  bulkCreate: protectedProcedure
    .input(
      z.object({
        dancers: z.array(dancerInputSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate all dancers belong to user's studio (for studio directors)
      if (isStudioDirector(ctx.userRole)) {
        if (!ctx.studioId) {
          throw new Error('Studio director must have an associated studio');
        }

        const invalidDancers = input.dancers.filter(d => d.studio_id !== ctx.studioId);
        if (invalidDancers.length > 0) {
          throw new Error('Cannot bulk create dancers for other studios');
        }
      }

      const results = await Promise.allSettled(
        input.dancers.map(async (dancerData) => {
          const { date_of_birth, ...data } = dancerData;
          return prisma.dancers.create({
            data: {
              ...data,
              tenant_id: ctx.tenantId!,
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

  // Batch create multiple dancers (for UI batch-add form)
  batchCreate: protectedProcedure
    .input(
      z.object({
        studio_id: z.string().uuid(),
        dancers: z.array(
          z.object({
            first_name: z.string().min(1).max(100),
            last_name: z.string().min(1).max(100),
            date_of_birth: z.string().optional(), // ISO date string
            gender: z.string().max(20).optional(),
            email: z.string().email().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
            phone: z.string().max(50).optional(),
            skill_level: z.string().max(50).optional(),
          })
        ).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Studio directors can only create dancers for their own studio
      if (isStudioDirector(ctx.userRole)) {
        if (!ctx.studioId) {
          throw new Error('Studio director must have an associated studio');
        }
        if (input.studio_id !== ctx.studioId) {
          throw new Error('Cannot create dancers for other studios');
        }
      }

      // Fetch studio to get tenant_id
      const studio = await prisma.studios.findUnique({
        where: { id: input.studio_id },
        select: { tenant_id: true },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Process each dancer in batch
      const results = await Promise.allSettled(
        input.dancers.map(async (dancerData) => {
          const { date_of_birth, gender, ...data } = dancerData;

          return prisma.dancers.create({
            data: {
              studios: { connect: { id: input.studio_id } },
              tenants: { connect: { id: studio.tenant_id } },
              ...data,
              // Convert ISO date string to Date object (required by Prisma DateTime field)
              date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
              gender: gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : undefined,
              status: 'active',
            },
          });
        })
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      // Bug Fix: Provide detailed error messages with row numbers and field info
      const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r: any, rejectedIndex) => {
          // Find the original dancer data for this failed import
          const allResultIndices = results.map((result, idx) => ({ result, idx }));
          const rejectedResults = allResultIndices.filter(item => item.result.status === 'rejected');
          const originalIndex = rejectedResults[rejectedIndex]?.idx || rejectedIndex;
          const dancer = input.dancers[originalIndex];
          const reason = r.reason;

          // Handle Prisma error codes
          if (reason?.code === 'P2002') {
            // Unique constraint violation
            const fields = reason.meta?.target?.join(', ') || 'field';
            return `Row ${originalIndex + 2}: ${dancer?.first_name || 'Unknown'} ${dancer?.last_name || ''} - Duplicate ${fields}`;
          } else if (reason?.code === 'P2003') {
            // Foreign key constraint violation
            return `Row ${originalIndex + 2}: ${dancer?.first_name || 'Unknown'} ${dancer?.last_name || ''} - Invalid reference`;
          } else if (reason?.message) {
            return `Row ${originalIndex + 2}: ${dancer?.first_name || 'Unknown'} ${dancer?.last_name || ''} - ${reason.message}`;
          } else {
            return `Row ${originalIndex + 2}: ${dancer?.first_name || 'Unknown'} ${dancer?.last_name || ''} - Unknown error`;
          }
        });

      // Get the created dancers from successful results
      const createdDancers = results
        .filter((r) => r.status === 'fulfilled')
        .map((r: any) => r.value);

      // Batch activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: ctx.studioId || input.studio_id,
          action: 'dancer.batchCreate',
          entityType: 'dancer',
          entityId: 'batch',
          details: {
            count: createdDancers.length,
            studio_id: input.studio_id,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (dancer.batchCreate)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        successful,
        failed,
        total: input.dancers.length,
        errors: errors.length > 0 ? errors : undefined,
        dancers: createdDancers,
      };
    }),

  // Bulk import from CSV (resolves studio codes to IDs)
  bulkImport: protectedProcedure
    .input(
      z.object({
        dancers: z.array(
          z.object({
            first_name: z.string().min(1),
            last_name: z.string().min(1),
            studio_code: z.string().length(5),
            date_of_birth: z.string().optional(),
            gender: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional(),
            parent_name: z.string().optional(),
            parent_email: z.string().optional(),
            parent_phone: z.string().optional(),
            registration_number: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get all unique studio codes from the input
      const studioCodes = [...new Set(input.dancers.map((d) => d.studio_code))];

      // Fetch all studios by code in a single query
      const studios = await prisma.studios.findMany({
        where: {
          code: {
            in: studioCodes,
          },
        },
        select: {
          id: true,
          code: true,
        },
      });

      // Create a map of studio code to studio ID
      const studioMap = new Map(studios.map((s) => [s.code, s.id]));

      // Studio directors can only import dancers for their own studio
      if (isStudioDirector(ctx.userRole)) {
        if (!ctx.studioId) {
          throw new Error('Studio director must have an associated studio');
        }

        // Check if any of the studio codes map to a different studio
        const resolvedStudioIds = [...new Set(Array.from(studioMap.values()))];
        const unauthorizedImport = resolvedStudioIds.some(id => id !== ctx.studioId);

        if (unauthorizedImport || resolvedStudioIds.length > 1) {
          throw new Error('Cannot bulk import dancers for other studios');
        }
      }

      // Process each dancer
      const results = await Promise.allSettled(
        input.dancers.map(async (dancerData) => {
          const studio_id = studioMap.get(dancerData.studio_code);

          if (!studio_id) {
            throw new Error(`Studio with code ${dancerData.studio_code} not found`);
          }

          const { studio_code, date_of_birth, ...data } = dancerData;

          return prisma.dancers.create({
            data: {
              studio_id,
              tenant_id: ctx.tenantId!,
              ...data,
              date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
              gender: data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1).toLowerCase() : undefined,
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
