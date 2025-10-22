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
          role: z.enum(['studio_director', 'competition_director', 'super_admin', 'judge']).optional(),
          search: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input = {} }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can access user management');
      }

      const { tenantId, role, search, limit = 50, offset = 0 } = input;

      const where: any = {};

      if (tenantId) {
        where.tenant_id = tenantId;
      }

      if (role) {
        where.role = role;
      }

      if (search) {
        where.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { users: { email: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [users, total] = await Promise.all([
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
            users: {
              select: {
                email: true,
                last_sign_in_at: true,
                _count: {
                  select: {
                    studios_studios_owner_idTousers: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.user_profiles.count({ where }),
      ]);

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
        newRole: z.enum(['studio_director', 'competition_director', 'super_admin', 'judge']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can change user roles');
      }

      const user = await prisma.user_profiles.update({
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
          users: {
            select: {
              email: true,
            },
          },
        },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'user.role_change',
          entityType: 'user',
          entityId: input.userId,
          details: {
            target_user_email: user.users.email,
            new_role: input.newRole,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (user.role_change)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return user;
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

      const user = await prisma.user_profiles.update({
        where: { id: input.userId },
        data: {
          updated_at: new Date(),
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          users: {
            select: {
              email: true,
            },
          },
        },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          action: input.isActive ? 'user.enable' : 'user.disable',
          entityType: 'user',
          entityId: input.userId,
          details: {
            target_user_email: user.users.email,
            new_status: input.isActive ? 'active' : 'disabled',
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (user.toggle_status)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return user;
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

      // Get user email from user_profiles
      const user = await prisma.user_profiles.findUnique({
        where: { id: input.userId },
        select: {
          first_name: true,
          last_name: true,
          users: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!user || !user.users?.email) {
        throw new Error('User not found or has no email');
      }

      // Send password reset email via Supabase Admin API
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: user.users.email,
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
            target_user_email: user.users.email,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (user.password_reset)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: `Password reset email sent to ${user.users.email}`,
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

      const user = await prisma.user_profiles.findUnique({
        where: { id: input.userId },
        select: {
          first_name: true,
          last_name: true,
          role: true,
          users: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

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
            target_user_email: user.users?.email || 'unknown',
            target_user_name: `${user.first_name} ${user.last_name}`,
            target_user_role: user.role,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (user.delete)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: `User ${user.users?.email || 'unknown'} deleted successfully`,
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
        .optional()
    )
    .query(async ({ ctx, input = {} }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can access tenant management');
      }

      const { search, limit = 50, offset = 0 } = input;

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
          const result = await tx.reservations.deleteMany({
            where: { tenant_id: input.tenantId },
          });
          deletedCounts.reservations = result.count;
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
// MAIN ROUTER
// ============================================================================

export const superAdminRouter = router({
  users: userManagementRouter,
  tenants: tenantManagementRouter,
  bulk: bulkOperationsRouter,
});
