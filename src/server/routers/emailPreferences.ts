/**
 * Email Preferences Router
 *
 * Allows users (CD and SD) to manage their email notification preferences
 */

import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const emailTypeSchema = z.enum([
  'reservation_submitted',
  'reservation_approved',
  'reservation_rejected',
  'routine_summary_submitted',
  'invoice_received',
  'payment_confirmed',
  'entry_submitted',
  'missing_music',
  'studio_approved',
  'studio_rejected',
]);

export const emailPreferencesRouter = router({
  /**
   * Get all email preferences for current user
   * Creates default enabled preferences if none exist
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    // Get existing preferences
    const existingPrefs = await prisma.email_preferences.findMany({
      where: { user_id: userId },
    });

    // If user has no preferences, create defaults (all enabled)
    if (existingPrefs.length === 0) {
      const allEmailTypes = emailTypeSchema.options;

      await prisma.email_preferences.createMany({
        data: allEmailTypes.map(emailType => ({
          user_id: userId,
          email_type: emailType,
          enabled: true,
        })),
      });

      // Fetch newly created preferences
      return prisma.email_preferences.findMany({
        where: { user_id: userId },
      });
    }

    return existingPrefs;
  }),

  /**
   * Update a single email preference
   */
  update: protectedProcedure
    .input(z.object({
      emailType: emailTypeSchema,
      enabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;

      // Upsert the preference
      const updated = await prisma.email_preferences.upsert({
        where: {
          user_id_email_type: {
            user_id: userId,
            email_type: input.emailType,
          },
        },
        update: {
          enabled: input.enabled,
        },
        create: {
          user_id: userId,
          email_type: input.emailType,
          enabled: input.enabled,
        },
      });

      return updated;
    }),

  /**
   * Check if a specific email type is enabled for a user
   * Used before sending emails
   */
  isEnabled: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      emailType: emailTypeSchema,
    }))
    .query(async ({ input }) => {
      const pref = await prisma.email_preferences.findUnique({
        where: {
          user_id_email_type: {
            user_id: input.userId,
            email_type: input.emailType,
          },
        },
      });

      // Default to true if no preference exists
      return pref?.enabled ?? true;
    }),
});
