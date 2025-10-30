import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

/**
 * Site Control Router
 * Super Admin only - controls site-wide settings like maintenance mode
 */
export const siteControlRouter = router({
  /**
   * Get current site pause status
   * Public read (needed for middleware to check)
   */
  getSiteStatus: publicProcedure.query(async () => {
    const setting = await prisma.system_settings.findUnique({
      where: { key: 'site_paused' },
      select: { value: true },
    });

    // value is stored as JSON, parse it
    const isPaused = setting?.value === true || setting?.value === 'true';

    return {
      isPaused,
    };
  }),

  /**
   * Toggle site pause status
   * Super Admin only
   */
  toggleSitePause: publicProcedure.mutation(async ({ ctx }) => {
    // Check if user is super_admin
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Super Admin can pause the site',
      });
    }

    // Get current status
    const setting = await prisma.system_settings.findUnique({
      where: { key: 'site_paused' },
      select: { value: true },
    });

    const currentlyPaused = setting?.value === true || setting?.value === 'true';
    const newStatus = !currentlyPaused;

    // Update or create the setting
    await prisma.system_settings.upsert({
      where: { key: 'site_paused' },
      update: {
        value: newStatus,
        updated_at: new Date(),
      },
      create: {
        key: 'site_paused',
        value: newStatus,
        description: 'Controls whether the site is in maintenance mode. When true, all users except super_admin see maintenance page.',
        category: 'system',
        data_type: 'boolean',
        is_public: false,
        requires_admin: true,
      },
    });

    return {
      isPaused: newStatus,
      message: newStatus ? 'Site paused - maintenance mode active' : 'Site unpaused - back to normal',
    };
  }),
});
