import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { isAdmin, isSuperAdmin } from '@/lib/auth-utils';

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
  // Super admins can see competitions across all tenants
  getAll: protectedProcedure
    .input(
      z
        .object({
          year: z.number().int().optional(),
          status: z.string().optional(),
          isPublic: z.boolean().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
          tenantId: z.string().uuid().optional(), // Super admin can filter by specific tenant
        })
        .nullish()
    )
    .query(async ({ ctx, input }) => {
      const { year, status, isPublic, limit = 50, offset = 0, tenantId } = input ?? {};

      const where: any = {};

      // Tenant filtering: super admins can see all tenants or filter by specific tenant
      if (isSuperAdmin(ctx.userRole)) {
        if (tenantId) {
          where.tenant_id = tenantId;
        }
        // No tenant filter if super admin and no specific tenant requested
      } else {
        // Non-super admins only see their own tenant's competitions
        if (ctx.tenantId) {
          where.tenant_id = ctx.tenantId;
        } else {
          // If no tenant context, return empty results
          return { competitions: [], total: 0 };
        }
      }

      if (year) {
        where.year = year;
      }

      if (status) {
        where.status = status;
      } else {
        // If no explicit status filter, exclude cancelled competitions (soft delete)
        where.status = { not: 'cancelled' };
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
            tenants: {
              select: {
                id: true,
                name: true,
                subdomain: true,
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
        .nullish()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      // Tenant filtering
      if (isSuperAdmin(ctx.userRole)) {
        // Super admins can see all tenants
      } else if (ctx.tenantId) {
        where.tenant_id = ctx.tenantId;
      } else {
        // No tenant context, return empty stats
        return { total: 0, byStatus: {}, byYear: [] };
      }

      // Exclude cancelled competitions for "active" count
      where.status = { not: 'cancelled' };

      if (input?.competitionId) {
        where.id = input.competitionId;
      }

      if (input?.year) {
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
  getUpcoming: publicProcedure.query(async ({ ctx }) => {
    const now = new Date();

    // Build WHERE clause with tenant filtering
    const where: any = {
      is_public: true,
      status: { not: 'cancelled' }, // Exclude cancelled events
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
    };

    // Tenant filtering (same pattern as getAll)
    if (isSuperAdmin(ctx.userRole)) {
      // Super admins can see all tenants
      // No tenant filter
    } else {
      // Non-super admins only see their own tenant's competitions
      if (ctx.tenantId) {
        where.tenant_id = ctx.tenantId;
      } else {
        // If no tenant context, return empty results
        return { competitions: [], count: 0 };
      }
    }

    const competitions = await prisma.competitions.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        year: true,
        competition_start_date: true,
        total_reservation_tokens: true,
        available_reservation_tokens: true,
        venue_capacity: true,
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
    .mutation(async ({ ctx, input }) => {
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
          tenant_id: ctx.tenantId!,
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
    .mutation(async ({ input, ctx }) => {
      const {
        registration_opens,
        registration_closes,
        competition_start_date,
        competition_end_date,
        entry_fee,
        late_fee,
        ...data
      } = input.data;

      // CAPACITY SYNC: If venue_capacity is being updated, sync reservation tokens
      let capacityUpdate = {};
      if (data.venue_capacity !== undefined) {
        // SECURITY: Filter by tenant_id to prevent cross-tenant updates
        const where: any = { id: input.id };
        if (ctx.tenantId) {
          where.tenant_id = ctx.tenantId;
        }

        const current = await prisma.competitions.findUnique({
          where,
          select: { venue_capacity: true, total_reservation_tokens: true, available_reservation_tokens: true },
        });

        if (current && current.venue_capacity !== null) {
          const capacityDiff = data.venue_capacity - current.venue_capacity;

          if (capacityDiff !== 0) {
            // Update both token fields by the same amount
            capacityUpdate = {
              total_reservation_tokens: { increment: capacityDiff },
              available_reservation_tokens: { increment: capacityDiff },
            };
          }
        }
      }

      // SECURITY: Filter by tenant_id to prevent cross-tenant updates
      const whereUpdate: any = { id: input.id };
      if (ctx.tenantId) {
        whereUpdate.tenant_id = ctx.tenantId;
      }

      const competition = await prisma.competitions.update({
        where: whereUpdate,
        data: {
          ...data,
          ...capacityUpdate, // Apply token sync if venue_capacity changed
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

  // Delete a competition (Competition Directors and Super Admins only)
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      hardDelete: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only CDs and super admins can delete competitions
      if (!isAdmin(ctx.userRole)) {
        throw new Error('Only competition directors and super admins can delete competitions');
      }

      await prisma.$transaction(async (tx) => {
        // 1. Return entries to draft (preserve entry data for studios)
        await tx.competition_entries.updateMany({
          where: { competition_id: input.id },
          data: {
            status: 'draft',
            session_id: null,
            performance_date: null,
            performance_time: null,
          },
        });

        // 2. Cancel reservations
        await tx.reservations.updateMany({
          where: { competition_id: input.id },
          data: {
            status: 'cancelled',
            internal_notes: 'Event deleted by CD (testing)',
          },
        });

        // 3. Hard delete scheduling data (testing only)
        await tx.competition_sessions.deleteMany({
          where: { competition_id: input.id },
        });

        await tx.judges.deleteMany({
          where: { competition_id: input.id },
        });

        // 4. Handle invoices (void them)
        await tx.invoices.updateMany({
          where: { competition_id: input.id },
          data: { status: 'void' },
        });

        // 5. Delete or soft-delete competition
        if (input.hardDelete) {
          // Nuclear option: truly delete everything
          await tx.invoices.deleteMany({ where: { competition_id: input.id } });
          await tx.reservations.deleteMany({ where: { competition_id: input.id } });
          await tx.competition_entries.deleteMany({ where: { competition_id: input.id } });
          await tx.competitions.delete({ where: { id: input.id } });
        } else {
          // Soft delete (recommended) - mark as cancelled
          await tx.competitions.update({
            where: { id: input.id },
            data: { status: 'cancelled', updated_at: new Date() },
          });
        }
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

  // Clone a competition (for recurring events)
  clone: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        newYear: z.number().int().min(2000).max(2100),
        newName: z.string().min(1).max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch original competition with all related data
      const original = await prisma.competitions.findUnique({
        where: { id: input.id },
        include: {
          competition_sessions: {
            orderBy: { session_number: 'asc' },
          },
          competition_locations: {
            orderBy: { name: 'asc' },
          },
        },
      });

      if (!original) {
        throw new Error('Competition not found');
      }

      // Create new competition with updated name and year
      const newName =
        input.newName || `${original.name} ${input.newYear}`.trim();

      const newCompetition = await prisma.competitions.create({
        data: {
          name: newName,
          year: input.newYear,
          tenant_id: ctx.tenantId!,
          description: original.description,
          registration_opens: original.registration_opens,
          registration_closes: original.registration_closes,
          competition_start_date: original.competition_start_date,
          competition_end_date: original.competition_end_date,
          primary_location: original.primary_location,
          venue_address: original.venue_address,
          venue_capacity: original.venue_capacity,
          session_count: original.session_count,
          number_of_judges: original.number_of_judges,
          entry_fee: original.entry_fee,
          late_fee: original.late_fee,
          allow_age_overrides: original.allow_age_overrides,
          allow_multiple_entries: original.allow_multiple_entries,
          require_video_submissions: original.require_video_submissions,
          status: 'upcoming', // New competition starts as upcoming
          is_public: original.is_public,
          logo_url: original.logo_url,
          website: original.website,
          contact_email: original.contact_email,
          contact_phone: original.contact_phone,
          rules_document_url: original.rules_document_url,
          available_reservation_tokens: original.venue_capacity || 600,
        },
      });

      // Clone sessions
      if (original.competition_sessions.length > 0) {
        await prisma.competition_sessions.createMany({
          data: original.competition_sessions.map((session) => ({
            tenant_id: ctx.tenantId!,
            competition_id: newCompetition.id,
            session_name: session.session_name,
            session_number: session.session_number,
            session_date: session.session_date,
            start_time: session.start_time,
            end_time: session.end_time,
            max_entries: session.max_entries,
            location_id: session.location_id,
          })),
        });
      }

      // Clone locations
      if (original.competition_locations.length > 0) {
        await prisma.competition_locations.createMany({
          data: original.competition_locations.map((location) => ({
            tenant_id: ctx.tenantId!,
            competition_id: newCompetition.id,
            name: location.name,
            address: location.address,
            capacity: location.capacity,
            stage_dimensions: location.stage_dimensions,
            dressing_rooms: location.dressing_rooms,
            warm_up_areas: location.warm_up_areas,
            parking_spaces: location.parking_spaces,
            audio_system: location.audio_system,
            lighting_system: location.lighting_system,
            video_recording: location.video_recording,
            live_streaming: location.live_streaming,
          })),
        });
      }

      // Return new competition with counts
      const result = await prisma.competitions.findUnique({
        where: { id: newCompetition.id },
        include: {
          _count: {
            select: {
              competition_entries: true,
              reservations: true,
              competition_sessions: true,
              competition_locations: true,
            },
          },
        },
      });

      return {
        competition: result,
        clonedFrom: original.name,
        sessionsCloned: original.competition_sessions.length,
        locationsCloned: original.competition_locations.length,
      };
    }),

  // Get tenant-wide competition settings (category types, dance categories, age divisions)
  getTenantSettings: protectedProcedure
    .query(async ({ ctx }) => {
      // Only CD and Super Admin can access this
      if (!ctx.userRole || !['competition_director', 'super_admin'].includes(ctx.userRole)) {
        throw new Error('Competition Director access required');
      }

      // Get all unique categories/classifications/age groups from existing entries in the tenant
      const entriesWhere: any = {
        status: { not: 'cancelled' },
      };

      if (!isSuperAdmin(ctx.userRole)) {
        if (ctx.tenantId) {
          entriesWhere.competitions = { tenant_id: ctx.tenantId };
        } else {
          return {
            categoryTypes: [],
            danceCategories: [],
            ageDivisions: [],
          };
        }
      }

      // Fetch all entries to get unique IDs
      const entries = await prisma.competition_entries.findMany({
        where: entriesWhere,
        select: {
          category_id: true,
          classification_id: true,
          age_group_id: true,
        },
      });

      // Extract unique IDs
      const uniqueCategoryIds = [...new Set(entries.map(e => e.category_id))].filter(Boolean);
      const uniqueClassificationIds = [...new Set(entries.map(e => e.classification_id))].filter(Boolean);
      const uniqueAgeGroupIds = [...new Set(entries.map(e => e.age_group_id))].filter(Boolean);

      // Fetch the actual records (filter by tenant for defense-in-depth)
      const [categoryTypes, danceCategories, ageDivisions] = await Promise.all([
        prisma.dance_categories.findMany({
          where: {
            id: { in: uniqueCategoryIds },
            ...(ctx.tenantId && { tenant_id: ctx.tenantId }),
          },
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy: { name: 'asc' },
        }),
        prisma.classifications.findMany({
          where: {
            id: { in: uniqueClassificationIds },
            ...(ctx.tenantId && { tenant_id: ctx.tenantId }),
          },
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy: { name: 'asc' },
        }),
        prisma.age_groups.findMany({
          where: {
            id: { in: uniqueAgeGroupIds },
            ...(ctx.tenantId && { tenant_id: ctx.tenantId }),
          },
          select: {
            id: true,
            name: true,
            min_age: true,
            max_age: true,
          },
          orderBy: { min_age: 'asc' },
        }),
      ]);

      return {
        categoryTypes,
        danceCategories,
        ageDivisions,
      };
    }),
});
