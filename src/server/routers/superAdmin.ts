import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logActivity } from '@/lib/activity';
import { logger } from '@/lib/logger';

/**
 * Super Admin Router
 *
 * Provides administrative functions for super admins:
 * - User management (view, change roles, disable/enable, reset passwords)
 * - Tenant management (create, edit, delete)
 * - Bulk operations (mass approve, bulk delete, bulk update)
 * - System monitoring (health, errors, performance)
 * - Cross-tenant analytics
 */

// ============================================================================
// USER MANAGEMENT
// ============================================================================

const userManagementRouter = router({
  // Get all users across all tenants
  getAllUsers: protectedProcedure
    .input(
      z
        .object({
          tenantId: z.string().uuid().optional(),
          role: z.enum(['studio_director', 'competition_director', 'super_admin']).optional(),
          search: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .nullish()
    )
    .query(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can access user management');
      }

      const { tenantId, role, search, limit = 50, offset = 0 } = input ?? {};

      const where: any = {};

      if (tenantId) {
        where.tenant_id = tenantId;
      }

      if (role) {
        where.role = role;
      }

      if (search) {
        // Note: email search is handled separately via raw SQL below
        where.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [userProfiles, total] = await Promise.all([
        prisma.user_profiles.findMany({
          where,
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
            tenant_id: true,
            phone: true,
            created_at: true,
            tenants: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.user_profiles.count({ where }),
      ]);

      // Fetch auth.users data separately (email, last_sign_in_at)
      const userIds = userProfiles.map(u => u.id);
      const authUsersData = userIds.length > 0 ? await prisma.$queryRaw<{
        id: string;
        email: string;
        last_sign_in_at: Date | null;
      }[]>`
        SELECT id, email, last_sign_in_at
        FROM auth.users
        WHERE id = ANY(${userIds}::uuid[])
      ` : [];
      const authUserMap = new Map(authUsersData.map(u => [u.id, u]));

      // Get studio counts per user
      const studioCounts = userIds.length > 0 ? await prisma.studios.groupBy({
        by: ['owner_id'],
        where: { owner_id: { in: userIds } },
        _count: { id: true },
      }) : [];
      const studioCountMap = new Map(studioCounts.map(s => [s.owner_id!, s._count.id]));

      // Merge data
      const users = userProfiles.map(profile => {
        const authUser = authUserMap.get(profile.id);
        return {
          ...profile,
          users: {
            email: authUser?.email || null,
            last_sign_in_at: authUser?.last_sign_in_at || null,
            _count: {
              studios_studios_owner_idTousers: studioCountMap.get(profile.id) || 0,
            },
          },
        };
      });

      return {
        users,
        total,
        limit,
        offset,
        hasMore: offset + users.length < total,
      };
    }),

  // Change user role
  changeRole: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        newRole: z.enum(['studio_director', 'competition_director', 'super_admin']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can change user roles');
      }

      const userProfile = await prisma.user_profiles.update({
        where: { id: input.userId },
        data: {
          role: input.newRole,
          updated_at: new Date(),
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          role: true,
        },
      });

      // Get email from auth.users separately
      const authUser = await prisma.$queryRaw<{ email: string }[]>`
        SELECT email FROM auth.users WHERE id = ${input.userId}::uuid LIMIT 1
      `;
      const userEmail = authUser[0]?.email || null;

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'user.role_change',
          entityType: 'user',
          entityId: input.userId,
          details: {
            target_user_email: userEmail,
            new_role: input.newRole,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (user.role_change)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      // Return with merged email for compatibility
      return {
        ...userProfile,
        users: { email: userEmail },
      };
    }),

  // Disable/enable user account
  toggleUserStatus: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can toggle user status');
      }

      const userProfile = await prisma.user_profiles.update({
        where: { id: input.userId },
        data: {
          updated_at: new Date(),
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      });

      // Get email from auth.users separately
      const authUser = await prisma.$queryRaw<{ email: string }[]>`
        SELECT email FROM auth.users WHERE id = ${input.userId}::uuid LIMIT 1
      `;
      const userEmail = authUser[0]?.email || null;

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: input.isActive ? 'user.enable' : 'user.disable',
          entityType: 'user',
          entityId: input.userId,
          details: {
            target_user_email: userEmail,
            new_status: input.isActive ? 'active' : 'disabled',
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (user.toggle_status)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        ...userProfile,
        users: { email: userEmail },
      };
    }),

  // Reset user password (sends password reset email via Supabase)
  resetPassword: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can reset user passwords');
      }

      // Get user profile
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: input.userId },
        select: {
          first_name: true,
          last_name: true,
        },
      });

      if (!userProfile) {
        throw new Error('User not found');
      }

      // Get email from auth.users separately
      const authUser = await prisma.$queryRaw<{ email: string }[]>`
        SELECT email FROM auth.users WHERE id = ${input.userId}::uuid LIMIT 1
      `;
      const userEmail = authUser[0]?.email;

      if (!userEmail) {
        throw new Error('User has no email');
      }

      // Send password reset email via Supabase Admin API
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: userEmail,
      });

      if (error) {
        logger.error('Failed to generate password reset link', { error, userId: input.userId });
        throw new Error('Failed to send password reset email');
      }

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'user.password_reset',
          entityType: 'user',
          entityId: input.userId,
          details: {
            target_user_email: userEmail,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (user.password_reset)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: `Password reset email sent to ${userEmail}`,
      };
    }),

  // Delete user account (hard delete)
  deleteUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can delete user accounts');
      }

      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: input.userId },
        select: {
          first_name: true,
          last_name: true,
          role: true,
        },
      });

      if (!userProfile) {
        throw new Error('User not found');
      }

      // Get email from auth.users separately
      const authUser = await prisma.$queryRaw<{ email: string }[]>`
        SELECT email FROM auth.users WHERE id = ${input.userId}::uuid LIMIT 1
      `;
      const userEmail = authUser[0]?.email || 'unknown';

      await prisma.$transaction(async (tx) => {
        // Delete user profile
        await tx.user_profiles.delete({
          where: { id: input.userId },
        });

        // Delete from Supabase Auth
        const { error } = await supabaseAdmin.auth.admin.deleteUser(input.userId);
        if (error) {
          logger.error('Failed to delete user from Supabase Auth', { error, userId: input.userId });
          throw new Error('Failed to delete user from auth system');
        }
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'user.delete',
          entityType: 'user',
          entityId: input.userId,
          details: {
            target_user_email: userEmail,
            target_user_name: `${userProfile.first_name} ${userProfile.last_name}`,
            target_user_role: userProfile.role,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (user.delete)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: `User ${userEmail} deleted successfully`,
      };
    }),
});

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

const tenantManagementRouter = router({
  // Get all tenants
  getAllTenants: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .nullish()
    )
    .query(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can access tenant management');
      }

      const { search, limit = 50, offset = 0 } = input ?? {};

      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { subdomain: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [tenants, total] = await Promise.all([
        prisma.tenants.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            subdomain: true,
            branding: true,
            created_at: true,
            updated_at: true,
            _count: {
              select: {
                competitions: true,
                studios: true,
                user_profiles: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.tenants.count({ where }),
      ]);

      return {
        tenants,
        total,
        limit,
        offset,
        hasMore: offset + tenants.length < total,
      };
    }),

  // Create tenant with subdomain
  createTenant: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        subdomain: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens'),
        contactEmail: z.string().email().optional(),
        logoUrl: z.string().url().optional(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        tagline: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can create tenants');
      }

      // Check if subdomain already exists
      const existing = await prisma.tenants.findUnique({
        where: { subdomain: input.subdomain },
      });

      if (existing) {
        throw new Error(`Subdomain '${input.subdomain}' is already taken`);
      }

      // Build branding JSON
      const branding: Record<string, any> = {};
      if (input.primaryColor) branding.primaryColor = input.primaryColor;
      if (input.secondaryColor) branding.secondaryColor = input.secondaryColor;
      if (input.logoUrl) branding.logo = input.logoUrl;
      if (input.tagline) branding.tagline = input.tagline;
      if (input.contactEmail) branding.contactEmail = input.contactEmail;

      const tenant = await prisma.tenants.create({
        data: {
          name: input.name,
          slug: input.subdomain, // Use subdomain as slug
          subdomain: input.subdomain,
          branding: branding,
        },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'tenant.create',
          entityType: 'tenant',
          entityId: tenant.id,
          details: {
            tenant_name: tenant.name,
            subdomain: tenant.subdomain,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (tenant.create)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        tenant,
        message: `Tenant '${tenant.name}' created successfully`,
        subdomainUrl: `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'compportal.com'}`,
      };
    }),

  // Update tenant
  updateTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        data: z.object({
          name: z.string().min(2).max(255).optional(),
          subdomain: z.string().min(2).max(63).regex(/^[a-z0-9-]+$/).optional(),
          contactEmail: z.string().email().optional(),
          logoUrl: z.string().url().optional().or(z.literal('')),
          primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          tagline: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can update tenants');
      }

      // If subdomain is being changed, check if it's available
      if (input.data.subdomain) {
        const existing = await prisma.tenants.findFirst({
          where: {
            subdomain: input.data.subdomain,
            id: { not: input.tenantId },
          },
        });

        if (existing) {
          throw new Error(`Subdomain '${input.data.subdomain}' is already taken`);
        }
      }

      // Get existing tenant to merge branding
      const existingTenant = await prisma.tenants.findUnique({
        where: { id: input.tenantId },
        select: { branding: true },
      });

      // Merge branding updates
      const existingBranding = (existingTenant?.branding as Record<string, any>) || {};
      const brandingUpdates: Record<string, any> = { ...existingBranding };

      if (input.data.primaryColor !== undefined) brandingUpdates.primaryColor = input.data.primaryColor;
      if (input.data.secondaryColor !== undefined) brandingUpdates.secondaryColor = input.data.secondaryColor;
      if (input.data.logoUrl !== undefined) brandingUpdates.logo = input.data.logoUrl;
      if (input.data.tagline !== undefined) brandingUpdates.tagline = input.data.tagline;
      if (input.data.contactEmail !== undefined) brandingUpdates.contactEmail = input.data.contactEmail;

      const updateData: any = {
        updated_at: new Date(),
      };

      if (input.data.name) updateData.name = input.data.name;
      if (input.data.subdomain) {
        updateData.subdomain = input.data.subdomain;
        updateData.slug = input.data.subdomain; // Update slug to match
      }
      if (Object.keys(brandingUpdates).length > 0) {
        updateData.branding = brandingUpdates;
      }

      const tenant = await prisma.tenants.update({
        where: { id: input.tenantId },
        data: updateData,
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'tenant.update',
          entityType: 'tenant',
          entityId: tenant.id,
          details: {
            tenant_name: tenant.name,
            changes: input.data,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (tenant.update)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return tenant;
    }),

  // Delete tenant (careful - cascades to all data)
  deleteTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        confirmSubdomain: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can delete tenants');
      }

      const tenant = await prisma.tenants.findUnique({
        where: { id: input.tenantId },
        select: {
          id: true,
          name: true,
          subdomain: true,
          _count: {
            select: {
              competitions: true,
              studios: true,
              user_profiles: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Require subdomain confirmation for safety
      if (tenant.subdomain !== input.confirmSubdomain) {
        throw new Error('Subdomain confirmation does not match');
      }

      // Delete tenant (cascades via DB constraints)
      await prisma.tenants.delete({
        where: { id: input.tenantId },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'tenant.delete',
          entityType: 'tenant',
          entityId: input.tenantId,
          details: {
            tenant_name: tenant.name,
            subdomain: tenant.subdomain,
            competitions_count: tenant._count.competitions,
            studios_count: tenant._count.studios,
            users_count: tenant._count.user_profiles,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (tenant.delete)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: `Tenant '${tenant.name}' deleted successfully`,
        deletedCounts: tenant._count,
      };
    }),
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

const bulkOperationsRouter = router({
  // Mass approve studios
  massApproveStudios: protectedProcedure
    .input(
      z.object({
        studioIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can perform bulk operations');
      }

      const result = await prisma.studios.updateMany({
        where: {
          id: { in: input.studioIds },
          status: 'pending',
        },
        data: {
          status: 'approved',
          verified_at: new Date(),
          verified_by: ctx.userId,
          updated_at: new Date(),
        },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'bulk.approve_studios',
          entityType: 'studio',
          entityId: ctx.userId,
          details: {
            studio_ids: input.studioIds,
            count: result.count,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (bulk.approve_studios)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: `${result.count} studios approved`,
        count: result.count,
      };
    }),

  // Bulk delete test data
  bulkDeleteTestData: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        dataTypes: z.array(z.enum(['entries', 'reservations', 'dancers', 'studios', 'competitions'])),
        confirmTenantName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can perform bulk delete operations');
      }

      const tenant = await prisma.tenants.findUnique({
        where: { id: input.tenantId },
        select: { name: true },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Require tenant name confirmation for safety
      if (tenant.name !== input.confirmTenantName) {
        throw new Error('Tenant name confirmation does not match');
      }

      const deletedCounts: Record<string, number> = {};

      await prisma.$transaction(async (tx) => {
        if (input.dataTypes.includes('entries')) {
          const result = await tx.competition_entries.deleteMany({
            where: { tenant_id: input.tenantId },
          });
          deletedCounts.entries = result.count;
        }

        if (input.dataTypes.includes('reservations')) {
          // Get all reservations with their capacity to refund BEFORE deletion
          const reservationsToDelete = await tx.reservations.findMany({
            where: { tenant_id: input.tenantId },
            select: {
              id: true,
              competition_id: true,
              spaces_confirmed: true,
              status: true,
            },
          });

          // Delete reservations first
          const result = await tx.reservations.deleteMany({
            where: { tenant_id: input.tenantId },
          });
          deletedCounts.reservations = result.count;

          // Refund capacity for approved reservations back to competitions
          // ONLY if we're not also deleting competitions (would fail since comp doesn't exist)
          if (!input.dataTypes.includes('competitions')) {
            for (const reservation of reservationsToDelete) {
              if (reservation.status === 'approved' && reservation.spaces_confirmed) {
                // Directly update competition capacity (can't use CapacityService in transaction)
                await tx.competitions.update({
                  where: { id: reservation.competition_id },
                  data: {
                    available_reservation_tokens: {
                      increment: reservation.spaces_confirmed,
                    },
                  },
                });
              }
            }
          }
        }

        if (input.dataTypes.includes('dancers')) {
          const result = await tx.dancers.deleteMany({
            where: { tenant_id: input.tenantId },
          });
          deletedCounts.dancers = result.count;
        }

        if (input.dataTypes.includes('studios')) {
          const result = await tx.studios.deleteMany({
            where: { tenant_id: input.tenantId },
          });
          deletedCounts.studios = result.count;
        }

        if (input.dataTypes.includes('competitions')) {
          const result = await tx.competitions.deleteMany({
            where: { tenant_id: input.tenantId },
          });
          deletedCounts.competitions = result.count;
        }
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'bulk.delete_test_data',
          entityType: 'tenant',
          entityId: input.tenantId,
          details: {
            tenant_name: tenant.name,
            data_types: input.dataTypes,
            deleted_counts: deletedCounts,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (bulk.delete_test_data)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: 'Test data deleted successfully',
        deletedCounts,
      };
    }),

  // Bulk update competition settings
  bulkUpdateCompetitionSettings: protectedProcedure
    .input(
      z.object({
        competitionIds: z.array(z.string().uuid()),
        settings: z.object({
          status: z.enum(['upcoming', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled']).optional(),
          isPublic: z.boolean().optional(),
          allowAgeOverrides: z.boolean().optional(),
          allowMultipleEntries: z.boolean().optional(),
          requireVideoSubmissions: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can perform bulk operations');
      }

      const result = await prisma.competitions.updateMany({
        where: {
          id: { in: input.competitionIds },
        },
        data: {
          status: input.settings.status,
          is_public: input.settings.isPublic,
          allow_age_overrides: input.settings.allowAgeOverrides,
          allow_multiple_entries: input.settings.allowMultipleEntries,
          require_video_submissions: input.settings.requireVideoSubmissions,
          updated_at: new Date(),
        },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'bulk.update_competitions',
          entityType: 'competition',
          entityId: ctx.userId,
          details: {
            competition_ids: input.competitionIds,
            count: result.count,
            settings: input.settings,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (bulk.update_competitions)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: `${result.count} competitions updated`,
        count: result.count,
      };
    }),
});

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

const activityLogsRouter = router({
  // Get activity logs with advanced filtering
  getActivityLogs: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tenantId: z.string().uuid().optional(),
        userId: z.string().uuid().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can access activity logs');
      }

      const { search, tenantId, userId, action, entityType, limit, offset } = input;

      // Build WHERE clause
      const conditions: string[] = ['1=1'];
      const params: any[] = [];

      if (tenantId) {
        conditions.push(`al.tenant_id = $${params.length + 1}::uuid`);
        params.push(tenantId);
      }

      if (userId) {
        conditions.push(`al.user_id = $${params.length + 1}::uuid`);
        params.push(userId);
      }

      if (action) {
        conditions.push(`al.action ILIKE $${params.length + 1}`);
        params.push(`%${action}%`);
      }

      if (entityType) {
        conditions.push(`al.entity_type = $${params.length + 1}`);
        params.push(entityType);
      }

      if (search) {
        conditions.push(`(
          al.entity_name ILIKE $${params.length + 1} OR
          al.action ILIKE $${params.length + 1} OR
          up.first_name ILIKE $${params.length + 1} OR
          up.last_name ILIKE $${params.length + 1} OR
          t.name ILIKE $${params.length + 1}
        )`);
        params.push(`%${search}%`);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`
        SELECT COUNT(*) as count
        FROM activity_logs al
        LEFT JOIN user_profiles up ON al.user_id = up.id
        LEFT JOIN tenants t ON al.tenant_id = t.id
        WHERE ${whereClause}
      `, ...params);

      const total = Number(countResult[0]?.count || 0);

      // Get paginated results
      const activities = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          al.id,
          al.action,
          al.entity_type,
          al.entity_name,
          al.entity_id,
          al.details,
          al.created_at,
          up.id as user_id,
          up.first_name,
          up.last_name,
          up.role,
          t.id as tenant_id,
          t.name as tenant_name,
          t.subdomain as tenant_subdomain
        FROM activity_logs al
        LEFT JOIN user_profiles up ON al.user_id = up.id
        LEFT JOIN tenants t ON al.tenant_id = t.id
        WHERE ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `, ...params, limit, offset);

      return {
        activities: activities.map((activity) => ({
          id: activity.id,
          action: activity.action,
          entityType: activity.entity_type,
          entityName: activity.entity_name,
          entityId: activity.entity_id,
          details: activity.details,
          createdAt: activity.created_at,
          user: {
            id: activity.user_id,
            name: `${activity.first_name || ''} ${activity.last_name || ''}`.trim() || 'Unknown User',
            role: activity.role,
          },
          tenant: activity.tenant_name
            ? {
                id: activity.tenant_id,
                name: activity.tenant_name,
                subdomain: activity.tenant_subdomain,
              }
            : null,
        })),
        total,
      };
    }),
});

// ============================================================================
// SYSTEM HEALTH
// ============================================================================

const systemHealthRouter = router({
  // Get system health metrics
  getHealthMetrics: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can access system health');
    }

    try {
      // Database health check
      const dbStart = Date.now();
      const dbCheck = await prisma.$queryRaw<any[]>`SELECT 1 as ok`;
      const dbLatency = Date.now() - dbStart;
      const dbHealthy = dbCheck[0]?.ok === 1;

      // Count totals
      const [userCount, tenantCount, competitionCount, entryCount] = await Promise.all([
        prisma.user_profiles.count(),
        prisma.tenants.count(),
        prisma.competitions.count(),
        prisma.competition_entries.count(),
      ]);

      // Recent activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivity = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM activity_logs
        WHERE created_at >= ${yesterday}
      `;

      // Recent errors (from activity logs with error actions)
      const recentErrors = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM activity_logs
        WHERE created_at >= ${yesterday}
          AND (action LIKE '%error%' OR action LIKE '%fail%')
      `;

      // Check for capacity inconsistencies
      const capacityIssues = await prisma.$queryRaw<any[]>`
        SELECT
          c.id,
          c.name,
          c.max_capacity,
          c.reserved_capacity,
          c.available_reservation_tokens,
          (c.max_capacity - c.reserved_capacity - c.available_reservation_tokens) as discrepancy
        FROM competitions c
        WHERE (c.max_capacity - c.reserved_capacity - c.available_reservation_tokens) != 0
        LIMIT 10
      `;

      // Storage usage (approximate)
      const storageEstimate = await prisma.$queryRaw<{ size_mb: number }[]>`
        SELECT
          ROUND(SUM(pg_total_relation_size(quote_ident(table_name))) / (1024 * 1024), 2) as size_mb
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `;

      return {
        database: {
          healthy: dbHealthy,
          latency: dbLatency,
          storageMB: storageEstimate[0]?.size_mb || 0,
        },
        counts: {
          users: userCount,
          tenants: tenantCount,
          competitions: competitionCount,
          entries: entryCount,
        },
        activity: {
          last24Hours: Number(recentActivity[0]?.count || 0),
          errors: Number(recentErrors[0]?.count || 0),
        },
        issues: {
          capacityInconsistencies: capacityIssues.length,
          capacityDetails: capacityIssues,
        },
      };
    } catch (error) {
      logger.error('Failed to get health metrics', { error: error instanceof Error ? error : new Error(String(error)) });
      throw new Error('Failed to retrieve system health metrics');
    }
  }),

  // Get slow queries (queries taking >1s from pg_stat_statements if available)
  getSlowQueries: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can access slow queries');
    }

    try {
      // Check if pg_stat_statements extension is enabled
      const extensionCheck = await prisma.$queryRaw<any[]>`
        SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements'
      `;

      if (extensionCheck.length === 0) {
        return { enabled: false, queries: [] };
      }

      // Get slow queries
      const slowQueries = await prisma.$queryRaw<any[]>`
        SELECT
          query,
          calls,
          ROUND(total_exec_time::numeric, 2) as total_time_ms,
          ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
          ROUND(max_exec_time::numeric, 2) as max_time_ms
        FROM pg_stat_statements
        WHERE mean_exec_time > 1000
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `;

      return { enabled: true, queries: slowQueries };
    } catch (error) {
      logger.error('Failed to get slow queries', { error: error instanceof Error ? error : new Error(String(error)) });
      return { enabled: false, queries: [], error: 'Failed to retrieve slow queries' };
    }
  }),
});

// ============================================================================
// EMAIL MONITORING
// ============================================================================

const emailMonitoringRouter = router({
  // Get email logs with filtering
  getEmailLogs: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tenantId: z.string().uuid().optional(),
        status: z.enum(['all', 'success', 'failed']).default('all'),
        templateType: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can access email logs');
      }

      const { search, tenantId, status, templateType, limit, offset } = input;

      // Build WHERE clause
      const conditions: string[] = ['1=1'];
      const params: any[] = [];

      if (tenantId) {
        conditions.push(`el.tenant_id = $${params.length + 1}::uuid`);
        params.push(tenantId);
      }

      if (status === 'success') {
        conditions.push(`el.success = true`);
      } else if (status === 'failed') {
        conditions.push(`el.success = false`);
      }

      if (templateType) {
        conditions.push(`el.template_type = $${params.length + 1}`);
        params.push(templateType);
      }

      if (search) {
        conditions.push(`(
          el.recipient_email ILIKE $${params.length + 1} OR
          el.subject ILIKE $${params.length + 1} OR
          el.error_message ILIKE $${params.length + 1}
        )`);
        params.push(`%${search}%`);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`
        SELECT COUNT(*) as count
        FROM email_logs el
        WHERE ${whereClause}
      `, ...params);

      const total = Number(countResult[0]?.count || 0);

      // Get paginated results
      const emails = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          el.id,
          el.template_type,
          el.recipient_email,
          el.subject,
          el.success,
          el.error_message,
          el.sent_at,
          el.tenant_id,
          t.name as tenant_name,
          t.subdomain as tenant_subdomain,
          s.name as studio_name,
          c.name as competition_name
        FROM email_logs el
        LEFT JOIN tenants t ON el.tenant_id = t.id
        LEFT JOIN studios s ON el.studio_id = s.id
        LEFT JOIN competitions c ON el.competition_id = c.id
        WHERE ${whereClause}
        ORDER BY el.sent_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `, ...params, limit, offset);

      return {
        emails: emails.map((email) => ({
          id: email.id,
          templateType: email.template_type,
          recipientEmail: email.recipient_email,
          subject: email.subject,
          success: email.success,
          errorMessage: email.error_message,
          sentAt: email.sent_at,
          tenant: email.tenant_name
            ? {
                id: email.tenant_id,
                name: email.tenant_name,
                subdomain: email.tenant_subdomain,
              }
            : null,
          studioName: email.studio_name,
          competitionName: email.competition_name,
        })),
        total,
      };
    }),

  // Get email statistics
  getEmailStats: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can access email stats');
    }

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, last24h, last7d, failed24h, failed7d] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM email_logs`,
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM email_logs WHERE sent_at >= ${last24Hours}`,
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM email_logs WHERE sent_at >= ${last7Days}`,
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM email_logs WHERE sent_at >= ${last24Hours} AND success = false`,
      prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM email_logs WHERE sent_at >= ${last7Days} AND success = false`,
    ]);

    return {
      total: Number(total[0]?.count || 0),
      last24Hours: Number(last24h[0]?.count || 0),
      last7Days: Number(last7d[0]?.count || 0),
      failed24Hours: Number(failed24h[0]?.count || 0),
      failed7Days: Number(failed7d[0]?.count || 0),
    };
  }),
});

// ============================================================================
// BACKUP & RESTORE
// ============================================================================

const backupRestoreRouter = router({
  // Get backup history (using activity logs)
  getBackupHistory: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can access backup history');
    }

    // Get backup-related activity from logs
    const backups = await prisma.$queryRaw<any[]>`
      SELECT
        id,
        action,
        details,
        created_at,
        user_id
      FROM activity_logs
      WHERE action LIKE '%backup%' OR action LIKE '%restore%'
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return backups.map((backup) => ({
      id: backup.id,
      action: backup.action,
      details: backup.details,
      createdAt: backup.created_at,
      userId: backup.user_id,
    }));
  }),

  // Get database size and table counts
  getDatabaseInfo: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can access database info');
    }

    // Get database size
    const sizeResult = await prisma.$queryRaw<{ size_mb: number }[]>`
      SELECT
        ROUND(SUM(pg_total_relation_size(quote_ident(table_name))) / (1024 * 1024), 2) as size_mb
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    // Get table counts
    const tableCounts = await prisma.$queryRaw<any[]>`
      SELECT
        table_name,
        (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
      FROM (
        SELECT
          table_name,
          query_to_xml(format('SELECT COUNT(*) as cnt FROM %I.%I', table_schema, table_name), false, true, '') as xml_count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ) t
      ORDER BY row_count DESC
      LIMIT 20
    `;

    return {
      sizeMB: Number(sizeResult[0]?.size_mb) || 0,
      tables: tableCounts.map((t) => ({
        name: t.table_name,
        rowCount: t.row_count || 0,
      })),
    };
  }),

  // Create backup metadata (actual backup happens via Supabase dashboard/CLI)
  createBackupLog: protectedProcedure
    .input(
      z.object({
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can create backups');
      }

      try {
        await logActivity({
          userId: ctx.userId,
          action: 'backup.initiated',
          entityType: 'database',
          entityId: ctx.userId,
          details: {
            notes: input.notes,
            timestamp: new Date().toISOString(),
          },
        });

        return { success: true, message: 'Backup initiated. Use Supabase Dashboard to download.' };
      } catch (error) {
        logger.error('Failed to log backup activity', { error: error instanceof Error ? error : new Error(String(error)) });
        throw new Error('Failed to create backup log');
      }
    }),
});

// ============================================================================
// IMPERSONATION
// ============================================================================

const impersonationRouter = router({
  // Start impersonating a user
  startImpersonation: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can impersonate users');
      }

      // Get target user info
      const targetUser = await prisma.user_profiles.findUnique({
        where: { id: input.userId },
        include: { tenants: true },
      });

      if (!targetUser) {
        throw new Error('User not found');
      }

      // Get email from auth.users separately
      const authUser = await prisma.$queryRaw<{ email: string }[]>`
        SELECT email FROM auth.users WHERE id = ${input.userId}::uuid LIMIT 1
      `;
      const userEmail = authUser[0]?.email || null;

      // Log impersonation start
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'impersonation.start',
          entityType: 'user',
          entityId: input.userId,
          details: {
            targetUser: {
              id: targetUser.id,
              email: userEmail,
              role: targetUser.role,
              tenant: targetUser.tenants?.name,
            },
            impersonatedBy: ctx.userId,
            startedAt: new Date().toISOString(),
          },
        });
      } catch (err) {
        logger.error('Failed to log impersonation start', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        targetUser: {
          id: targetUser.id,
          email: userEmail,
          firstName: targetUser.first_name,
          lastName: targetUser.last_name,
          role: targetUser.role,
          tenantId: targetUser.tenant_id,
          tenantName: targetUser.tenants?.name,
        },
      };
    }),

  // Stop impersonating
  stopImpersonation: protectedProcedure
    .input(z.object({ targetUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can stop impersonation');
      }

      // Log impersonation end
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'impersonation.stop',
          entityType: 'user',
          entityId: input.targetUserId,
          details: {
            impersonatedBy: ctx.userId,
            endedAt: new Date().toISOString(),
          },
        });
      } catch (err) {
        logger.error('Failed to log impersonation stop', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return { success: true };
    }),

  // Get impersonation history
  getImpersonationHistory: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can view impersonation history');
    }

    const history = await prisma.$queryRaw<any[]>`
      SELECT
        al.id,
        al.action,
        al.entity_id as target_user_id,
        al.details,
        al.created_at,
        up.first_name,
        up.last_name,
        u.email
      FROM activity_logs al
      LEFT JOIN user_profiles up ON al.entity_id = up.id
      LEFT JOIN auth.users u ON al.entity_id = u.id
      WHERE al.action LIKE 'impersonation.%'
      ORDER BY al.created_at DESC
      LIMIT 100
    `;

    return history.map((record) => ({
      id: record.id,
      action: record.action,
      targetUserId: record.target_user_id,
      targetUserName: `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Unknown',
      targetUserEmail: record.email,
      details: record.details,
      createdAt: record.created_at,
    }));
  }),
});

// ============================================================================
// DAILY DIGEST MANAGEMENT
// ============================================================================

const digestRouter = router({
  // Send digest to specific user (test send)
  sendDigestToUser: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can trigger digest emails');
      }

      const { generateDigestForUser } = await import('@/lib/digest-generator');
      const { renderDailyDigest, getEmailSubject } = await import('@/lib/email-templates');
      const { sendEmail } = await import('@/lib/email');

      // Get user preferences (default to all enabled for manual trigger)
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: input.userId },
        select: {
          notification_preferences: true,
          role: true,
        },
      });

      if (!userProfile || userProfile.role !== 'competition_director') {
        throw new Error('User is not a Competition Director');
      }

      const preferences = (userProfile.notification_preferences as any)?.email_digest || {
        includeActivities: true,
        includeUpcomingEvents: true,
        includePendingActions: true,
        minimumActivityCount: 0, // For manual test, send even if empty
      };

      // Generate digest content
      const digestContent = await generateDigestForUser(input.userId, preferences);

      if (!digestContent) {
        throw new Error('No digest content generated (user may not be eligible)');
      }

      // Get tenant branding
      const tenant = await prisma.tenants.findUnique({
        where: { id: digestContent.tenantId },
        select: {
          name: true,
          branding: true,
        },
      });

      // Extract branding from JSON field
      const branding = tenant?.branding as any || {};

      // Transform upcoming events to match interface
      const upcomingEvents = digestContent.upcomingEvents.map((event: any) => {
        const daysUntil = Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: event.id,
          name: event.name,
          startDate: event.date,
          daysUntil,
        };
      });

      // Render email
      const emailHtml = await renderDailyDigest({
        userName: digestContent.userName,
        tenantName: digestContent.tenantName,
        portalUrl: `https://${tenant?.name.toLowerCase().replace(/\s+/g, '')}.compsync.net`,
        pendingActions: digestContent.pendingActions,
        upcomingEvents,
        recentActivity: digestContent.recentActivity,
        tenantBranding: {
          primaryColor: branding.primary_color || undefined,
          logo: branding.logo_url || undefined,
          tenantName: tenant?.name || undefined,
        },
      });

      const subject = getEmailSubject('daily-digest', {
        tenantName: digestContent.tenantName,
      });

      // Send email
      await sendEmail({
        to: digestContent.userEmail,
        subject,
        html: emailHtml,
        from: process.env.RESEND_FROM_EMAIL || 'noreply@compsync.net',
      });

      // Log activity
      await logActivity({
        userId: ctx.userId!,
        tenantId: digestContent.tenantId,
        action: 'digest.send',
        entityType: 'user_profile',
        entityId: input.userId,
        details: {
          summary: digestContent.summary,
          sentBy: 'super_admin',
        },
      });

      return {
        success: true,
        summary: digestContent.summary,
      };
    }),

  // Send digest to all users due for digest
  sendScheduledDigests: protectedProcedure.mutation(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can trigger scheduled digests');
    }

    const { getUsersDueForDigest, generateDigestForUser } = await import(
      '@/lib/digest-generator'
    );
    const { renderDailyDigest, getEmailSubject } = await import('@/lib/email-templates');
    const { sendEmail } = await import('@/lib/email');

    const usersDue = await getUsersDueForDigest();

    const results = {
      sent: [] as string[],
      failed: [] as Array<{ userId: string; error: string }>,
      skipped: [] as string[],
    };

    for (const { userId, preferences } of usersDue) {
      try {
        // Generate digest content
        const digestContent = await generateDigestForUser(userId, preferences);

        if (!digestContent) {
          results.skipped.push(userId);
          continue;
        }

        // Get tenant branding
        const tenant = await prisma.tenants.findUnique({
          where: { id: digestContent.tenantId },
          select: {
            name: true,
            branding: true,
          },
        });

        // Extract branding from JSON field
        const branding = tenant?.branding as any || {};

        // Render email
        const emailHtml = await renderDailyDigest({
          userName: digestContent.userName,
          tenantName: digestContent.tenantName,
          portalUrl: `https://${tenant?.name.toLowerCase().replace(/\s+/g, '')}.compsync.net`,
          pendingActions: digestContent.pendingActions,
          upcomingEvents: digestContent.upcomingEvents.map(event => ({
            id: event.id,
            name: event.name,
            startDate: event.date,
            daysUntil: Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          })),
          recentActivity: digestContent.recentActivity,
          tenantBranding: {
            primaryColor: branding.primary_color || undefined,
            logo: branding.logo_url || undefined,
            tenantName: tenant?.name || undefined,
          },
        });

        const subject = getEmailSubject('daily-digest', {
          tenantName: digestContent.tenantName,
        });

        // Send email
        await sendEmail({
          to: digestContent.userEmail,
          subject,
          html: emailHtml,
          from: process.env.RESEND_FROM_EMAIL || 'noreply@compsync.net',
        });

        // Log activity
        await logActivity({
          userId: ctx.userId!,
          tenantId: digestContent.tenantId,
          action: 'digest.send',
          entityType: 'user_profile',
          entityId: userId,
          details: {
            summary: digestContent.summary,
            sentBy: 'scheduled_cron',
          },
        });

        results.sent.push(userId);
      } catch (error) {
        logger.error('Failed to send digest to user', {
          error: error instanceof Error ? error : new Error(String(error)),
          userId,
        });
        results.failed.push({
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }),

  // Preview digest content for user without sending
  previewDigest: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can preview digests');
      }

      const { generateDigestForUser } = await import('@/lib/digest-generator');

      // Get user preferences
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: input.userId },
        select: {
          notification_preferences: true,
          role: true,
        },
      });

      if (!userProfile || userProfile.role !== 'competition_director') {
        throw new Error('User is not a Competition Director');
      }

      const preferences = (userProfile.notification_preferences as any)?.email_digest || {
        includeActivities: true,
        includeUpcomingEvents: true,
        includePendingActions: true,
        minimumActivityCount: 0,
      };

      // Generate digest content
      const digestContent = await generateDigestForUser(input.userId, preferences);

      return digestContent;
    }),
});

// ============================================================================
// ROUTINE VERIFICATION
// ============================================================================

const routineVerificationRouter = router({
  // Verify routines for age/data quality issues
  verifyRoutines: protectedProcedure
    .input(
      z.object({
        routineIds: z.array(z.string().uuid()).optional(),
      }).nullish()
    )
    .query(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can verify routines');
      }

      const routineIds = input?.routineIds;

      // Build WHERE clause for optional routine IDs filter
      const whereClause = routineIds && routineIds.length > 0
        ? `AND ce.id = ANY($1::uuid[])`
        : '';
      const params = routineIds && routineIds.length > 0 ? [routineIds] : [];

      // Get all routines with their dancers
      const routines = await prisma.$queryRawUnsafe<any[]>(`
        SELECT
          ce.id as routine_id,
          ce.title as routine_title,
          ce.routine_age as stored_age,
          ce.age_group_id,
          ce.status,
          ce.created_at,
          ag.name as age_group_name,
          ag.min_age,
          ag.max_age,
          t.id as tenant_id,
          t.name as tenant_name,
          s.name as studio_name,
          c.competition_start_date,
          jsonb_agg(
            jsonb_build_object(
              'dob', d.date_of_birth,
              'name', d.first_name || ' ' || d.last_name
            )
          ) as dancers
        FROM competition_entries ce
        LEFT JOIN age_groups ag ON ce.age_group_id = ag.id
        LEFT JOIN tenants t ON ce.tenant_id = t.id
        LEFT JOIN reservations r ON ce.reservation_id = r.id
        LEFT JOIN competitions c ON r.competition_id = c.id
        LEFT JOIN studios s ON r.studio_id = s.id
        LEFT JOIN entry_participants ep ON ep.entry_id = ce.id
        LEFT JOIN dancers d ON ep.dancer_id = d.id
        WHERE ce.routine_age IS NOT NULL
          ${whereClause}
        GROUP BY ce.id, ce.title, ce.routine_age, ce.age_group_id, ce.status, ce.created_at, ag.name, ag.min_age, ag.max_age, t.id, t.name, s.name, c.competition_start_date
        ORDER BY ce.created_at DESC
      `, ...params);

      // Process each routine to calculate correct age
      const results = routines.map((routine) => {
        const { routine_id, routine_title, stored_age, age_group_id, age_group_name, min_age, max_age, status, created_at, tenant_id, tenant_name, studio_name, competition_start_date, dancers } = routine;

        // Calculate age calculation date: Dec 31 of REGISTRATION year
        // Registration year = Competition year - 1 (ALWAYS the fall prior to comp year)
        // E.g., 2026 competition → 2025 registration year → Dec 31, 2025
        const ageCalcDate = competition_start_date
          ? (() => {
              const competitionYear = new Date(competition_start_date).getUTCFullYear();
              const registrationYear = competitionYear - 1;
              return new Date(Date.UTC(registrationYear, 11, 31));
            })()
          : new Date(Date.UTC(new Date().getUTCFullYear(), 11, 31)); // Fallback: Dec 31 of current year

        // Calculate correct age from dancers
        let correctAge: number;
        const dancerList = dancers as Array<{ dob: string; name: string }>;

        if (dancerList.length === 1) {
          // Solo - calculate age at competition date
          const dob = new Date(dancerList[0].dob);
          correctAge = ageCalcDate.getFullYear() - dob.getFullYear();
        } else {
          // Group - average ages (floored)
          const ages = dancerList.map((dancer) => {
            const dob = new Date(dancer.dob);
            return ageCalcDate.getFullYear() - dob.getFullYear();
          });
          correctAge = Math.floor(ages.reduce((sum, age) => sum + age, 0) / ages.length);
        }

        const discrepancy = stored_age - correctAge;
        const createdBeforeNov12 = new Date(created_at) < new Date('2025-11-12');

        // Classify severity
        let severity: 'PASS' | 'WARNING' | 'ERROR';
        if (discrepancy === 0) {
          severity = 'PASS';
        } else if (discrepancy === 1) {
          severity = 'WARNING'; // Could be intentional +1 override
        } else {
          severity = 'ERROR'; // Significant discrepancy
        }

        // Proposed age (correct calculated age, or +1 if WARNING created after Nov 12)
        const proposedAge = severity === 'WARNING' && !createdBeforeNov12
          ? correctAge + 1  // Preserve potential intentional override
          : correctAge;

        return {
          routineId: routine_id,
          routineTitle: routine_title,
          studioName: studio_name,
          tenantId: tenant_id,
          tenantName: tenant_name,
          status,
          severity,
          currentAge: stored_age,
          proposedAge,
          discrepancy,
          createdBeforeNov12,
          currentAgeGroup: age_group_name || 'N/A',
          proposedAgeGroup: age_group_name || 'N/A', // TODO: Calculate correct age group
          currentAgeGroupId: age_group_id,
          proposedAgeGroupId: age_group_id, // TODO: Calculate correct age group
        };
      });

      // Calculate summary
      const summary = {
        total: results.length,
        passed: results.filter(r => r.severity === 'PASS').length,
        warnings: results.filter(r => r.severity === 'WARNING').length,
        errors: results.filter(r => r.severity === 'ERROR').length,
      };

      return {
        results,
        summary,
      };
    }),

  // Apply routine corrections
  applyRoutineCorrections: protectedProcedure
    .input(
      z.object({
        corrections: z.array(
          z.object({
            routineId: z.string().uuid(),
            newAge: z.number().int().min(5).max(99),
            newAgeGroupId: z.string().uuid().nullable(),
          })
        ),
        notifyStudios: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can apply routine corrections');
      }

      if (input.corrections.length === 0) {
        throw new Error('No corrections to apply');
      }

      // Create backup table
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const backupTableName = `routine_age_correction_backup_${timestamp}`;

      const routineIds = input.corrections.map(c => c.routineId);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${backupTableName} AS
        SELECT
          id,
          routine_age,
          age_group_id,
          updated_at as original_updated_at,
          NOW() as backup_timestamp
        FROM competition_entries
        WHERE id IN (${routineIds.map((_, i) => `$${i + 1}::uuid`).join(', ')})
      `, ...routineIds);

      // Apply corrections in transaction
      await prisma.$transaction(async (tx) => {
        for (const correction of input.corrections) {
          await tx.competition_entries.update({
            where: { id: correction.routineId },
            data: {
              routine_age: correction.newAge,
              age_group_id: correction.newAgeGroupId ?? undefined,
              updated_at: new Date(),
            },
          });
        }
      });

      // Log activity
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'routine.bulk_age_correction',
          entityType: 'competition_entry',
          entityId: ctx.userId,
          details: {
            corrections_count: input.corrections.length,
            backup_table: backupTableName,
            notify_studios: input.notifyStudios,
          },
        });
      } catch (err) {
        logger.error('Failed to log routine correction activity', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      // TODO: Studio notification email logic if notifyStudios is true

      return {
        success: true,
        message: `${input.corrections.length} routines corrected successfully`,
        correctionCount: input.corrections.length,
        backupTable: backupTableName,
      };
    }),
});

// ============================================================================
// SCHEDULING PROGRESS MONITORING
// ============================================================================

const schedulingProgressRouter = router({
  // Get scheduling progress for all competitions
  getSchedulingProgress: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can access scheduling progress');
    }

    // Get all competitions with their routine counts
    const progressData = await prisma.$queryRaw<{
      competition_id: string;
      competition_name: string;
      tenant_id: string;
      tenant_name: string;
      total_routines: bigint;
      scheduled_routines: bigint;
      last_scheduled: Date | null;
    }[]>`
      SELECT
        c.id as competition_id,
        c.name as competition_name,
        c.tenant_id,
        t.name as tenant_name,
        COUNT(ce.id) as total_routines,
        COUNT(ce.id) FILTER (WHERE ce.session_id IS NOT NULL) as scheduled_routines,
        MAX(ce.updated_at) FILTER (WHERE ce.session_id IS NOT NULL) as last_scheduled
      FROM competitions c
      INNER JOIN tenants t ON c.tenant_id = t.id
      LEFT JOIN competition_entries ce ON ce.competition_id = c.id AND ce.status != 'cancelled'
      WHERE c.status NOT IN ('cancelled', 'completed')
      GROUP BY c.id, c.name, c.tenant_id, t.name
      HAVING COUNT(ce.id) > 0
      ORDER BY t.name, c.name
    `;

    const competitions = progressData.map(row => {
      const total = Number(row.total_routines);
      const scheduled = Number(row.scheduled_routines);
      return {
        competitionId: row.competition_id,
        competitionName: row.competition_name,
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        totalRoutines: total,
        scheduledRoutines: scheduled,
        percentComplete: total > 0 ? (scheduled / total) * 100 : 0,
        lastUpdated: row.last_scheduled?.toISOString() || null,
      };
    });

    return { competitions };
  }),

  // Send progress notification email
  sendProgressNotification: protectedProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
        threshold: z.number().int().min(0).max(100),
        recipientEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can send progress notifications');
      }

      // Get competition details
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        include: { tenants: true },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      // Get current progress
      const progressResult = await prisma.$queryRaw<{
        total: bigint;
        scheduled: bigint;
      }[]>`
        SELECT
          COUNT(id) as total,
          COUNT(id) FILTER (WHERE session_id IS NOT NULL) as scheduled
        FROM competition_entries
        WHERE competition_id = ${input.competitionId}
          AND status != 'cancelled'
      `;

      const total = Number(progressResult[0]?.total || 0);
      const scheduled = Number(progressResult[0]?.scheduled || 0);
      const percentComplete = total > 0 ? ((scheduled / total) * 100).toFixed(1) : '0';

      // Get tenant branding
      const branding = competition.tenants?.branding as { primaryColor?: string; logoUrl?: string } | null;
      const primaryColor = branding?.primaryColor || '#7c3aed';
      const logoUrl = branding?.logoUrl;
      const tenantName = competition.tenants?.name || 'CompSync';

      // Send email using the sendEmail utility
      const { sendEmail } = await import('@/lib/email');

      await sendEmail({
        to: input.recipientEmail,
        subject: `[${tenantName}] ${competition.name} - ${input.threshold}% Scheduling Milestone`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; padding: 32px; border-radius: 16px;">
            ${logoUrl ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${logoUrl}" alt="${tenantName}" style="max-height: 60px; max-width: 200px;" /></div>` : ''}
            <h2 style="color: ${primaryColor}; margin: 0 0 8px;">Scheduling Progress Alert</h2>
            <p style="color: #9ca3af; margin: 0 0 24px;">Competition: <strong style="color: #fff;">${competition.name}</strong></p>
            <div style="background: rgba(255,255,255,0.05); padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;">
              <p style="font-size: 20px; margin: 0; text-align: center; color: #9ca3af;">
                <strong style="color: #fff;">${scheduled}</strong> of <strong style="color: #fff;">${total}</strong> routines scheduled
              </p>
              <p style="font-size: 48px; color: ${primaryColor}; margin: 16px 0 0; text-align: center; font-weight: bold;">
                ${percentComplete}%
              </p>
            </div>
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px; text-align: center;">
              Milestone: ${input.threshold}% | ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
            </p>
            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #4b5563; font-size: 11px; margin: 0;">Powered by CompSync</p>
            </div>
          </div>
        `,
        templateType: 'progress_alert',
      });

      // Log activity
      await logActivity({
        userId: ctx.userId,
        action: 'scheduling.progress_notification',
        entityType: 'competition',
        entityId: input.competitionId,
        details: {
          competition_name: competition.name,
          threshold: input.threshold,
          percent_complete: percentComplete,
          recipient: input.recipientEmail,
        },
      });

      return { success: true, percentComplete };
    }),
});

// ============================================================================
// MAIN ROUTER
// ============================================================================

export const superAdminRouter = router({
  users: userManagementRouter,
  tenants: tenantManagementRouter,
  bulk: bulkOperationsRouter,
  activityLogs: activityLogsRouter,
  health: systemHealthRouter,
  emails: emailMonitoringRouter,
  backup: backupRestoreRouter,
  impersonation: impersonationRouter,
  digest: digestRouter,
  verifyRoutines: routineVerificationRouter.verifyRoutines,
  applyRoutineCorrections: routineVerificationRouter.applyRoutineCorrections,
  // Scheduling progress monitoring (Calendar Progress admin)
  getSchedulingProgress: schedulingProgressRouter.getSchedulingProgress,
  sendProgressNotification: schedulingProgressRouter.sendProgressNotification,
});
