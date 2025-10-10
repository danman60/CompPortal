import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * User Router - User profile and session data
 */
export const userRouter = router({
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

    // Fetch studio info if user is a studio director
    let studio = null;
    if (userProfile?.role === 'studio_director') {
      studio = await prisma.studios.findFirst({
        where: { owner_id: ctx.userId! },
        select: {
          id: true,
          name: true,
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

      return { success: true };
    }),
});
