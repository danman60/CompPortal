import { router, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-server';
import { z } from 'zod';
import { logActivity } from '@/lib/activity';
import { logger } from '@/lib/logger';

/**
 * User Router - User profile and session data
 */
export const userRouter = router({
  /**
   * Check if email exists in auth system (for signup validation)
   * Public endpoint - does not reveal user info beyond existence
   * Mutation (not query) so it can be called from client form handlers
   */
  checkEmailExists: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      try {
        // Query auth.users table directly via Prisma raw query
        const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS(
            SELECT 1 FROM auth.users WHERE email = ${input.email}
          ) as exists
        `;

        return { exists: result[0]?.exists || false };
      } catch (err) {
        // On any error, assume email might exist (fail safe)
        return { exists: true };
      }
    }),

  /**
   * Get current user profile with role and studio info
   */
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: ctx.userId! },
      select: {
        id: true,
        role: true,
        first_name: true,
        last_name: true,
        phone: true,
        notification_preferences: true,
        users: {
          select: {
            email: true,
          },
        },
      },
    });

    // Fetch tenant info for Chatwoot metadata
    const tenant = await prisma.tenants.findUnique({
      where: { id: ctx.tenantId! },
      select: {
        name: true,
        subdomain: true,
      },
    });

    // Fetch studio info if user is a studio director OR super admin (for testing)
    let studio = null;
    if (userProfile?.role === 'studio_director' || userProfile?.role === 'super_admin') {
      studio = await prisma.studios.findFirst({
        where: {
          tenant_id: ctx.tenantId!,  // Tenant isolation
          owner_id: ctx.userId!       // Studio isolation (prevent cross-contamination)
        },
        select: {
          id: true,
          name: true,
          public_code: true,
          status: true,
        },
      });
    }

    const notificationsEnabled = Boolean((userProfile?.notification_preferences as any)?.email ?? true);

    return {
      id: userProfile?.id,
      role: userProfile?.role,
      first_name: userProfile?.first_name,
      last_name: userProfile?.last_name,
      phone: userProfile?.phone,
      email: userProfile?.users?.email,
      notification_preferences: userProfile?.notification_preferences,
      notificationsEnabled,
      studio,
      tenantId: ctx.tenantId, // For tenant-scoped settings pages
      tenant, // Tenant name and subdomain for Chatwoot
    };
  }),

  /**
   * Get dashboard layout preferences
   */
  getDashboardLayout: protectedProcedure.query(async ({ ctx }) => {
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: ctx.userId! },
      select: {
        notification_preferences: true,
      },
    });

    const prefs = userProfile?.notification_preferences as any;
    return prefs?.dashboard_layout || null;
  }),

  /**
   * Save dashboard layout preferences
   */
  saveDashboardLayout: protectedProcedure
    .input(z.object({
      layout: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current preferences
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId! },
        select: {
          notification_preferences: true,
        },
      });

      const currentPrefs = (userProfile?.notification_preferences as any) || {};

      // Update with new layout
      const updatedPrefs = {
        ...currentPrefs,
        dashboard_layout: input.layout,
      };

      // Save back to database
      await prisma.user_profiles.update({
        where: { id: ctx.userId! },
        data: {
          notification_preferences: updatedPrefs,
        },
      });

      return { success: true };
    }),

  /**
   * Get email digest preferences
   */
  getEmailDigestPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: ctx.userId! },
      select: {
        notification_preferences: true,
      },
    });

    const prefs = userProfile?.notification_preferences as any;
    return prefs?.email_digest || null;
  }),

  /**
   * Save email digest preferences
   */
  saveEmailDigestPreferences: protectedProcedure
    .input(z.object({
      enabled: z.boolean(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      includeActivities: z.boolean(),
      includeNotifications: z.boolean(),
      includeUpcomingEvents: z.boolean(),
      includePendingActions: z.boolean(),
      minimumActivityCount: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current preferences
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId! },
        select: {
          notification_preferences: true,
        },
      });

      const currentPrefs = (userProfile?.notification_preferences as any) || {};

      // Update with new email digest preferences
      const updatedPrefs = {
        ...currentPrefs,
        email_digest: input,
      };

      // Save back to database
      await prisma.user_profiles.update({
        where: { id: ctx.userId! },
        data: {
          notification_preferences: updatedPrefs,
        },
      });

      return { success: true };
    }),

  /**
   * Update current user's profile
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        first_name: z.string().min(1),
        last_name: z.string().min(1),
        phone: z.string().optional().or(z.literal('')),
        notificationsEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch current prefs
      const existing = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId! },
        select: { notification_preferences: true },
      });
      const prefs = (existing?.notification_preferences as any) || {};
      const updatedPrefs =
        typeof input.notificationsEnabled === 'boolean'
          ? { ...prefs, email: input.notificationsEnabled }
          : prefs;

      await prisma.user_profiles.update({
        where: { id: ctx.userId! },
        data: {
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone || null,
          notification_preferences: updatedPrefs,
        },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId!,
          action: 'profile.update',
          entityType: 'user',
          entityId: ctx.userId!,
          details: {
            first_name: input.first_name,
            last_name: input.last_name,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (profile.update)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return { success: true };
    }),

  /**
   * Get all tenants (Super Admin only)
   * Allows SA to view and switch between tenants
   */
  getAllTenants: protectedProcedure.query(async ({ ctx }) => {
    // Only super admins can access this
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Super admin access required',
      });
    }

    const tenants = await prisma.tenants.findMany({
      select: {
        id: true,
        slug: true,
        subdomain: true,
        name: true,
        branding: true,
        created_at: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { tenants };
  }),
});
