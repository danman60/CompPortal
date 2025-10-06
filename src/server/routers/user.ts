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

    return {
      ...userProfile,
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
});
