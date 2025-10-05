import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

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
});
