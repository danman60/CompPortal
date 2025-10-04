import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

/**
 * Settings Router - Competition Configuration Management
 *
 * Categories:
 * - routine_types: Solo, Duet/Trio, Small Group, Large Group, Production
 * - age_divisions: Mini, Petite, Junior, Teen, Senior, Adult
 * - classification_levels: Novice, Intermediate, Advanced, Elite
 * - dance_styles: Jazz, Tap, Ballet, Contemporary, Hip Hop, etc.
 * - time_limits: Routine duration limits by size/category
 * - scoring_rubric: Judge scoring criteria and weights
 * - awards: Award types and placement rules
 */

/**
 * Valid setting categories
 */
const settingCategories = [
  'routine_types',
  'age_divisions',
  'classification_levels',
  'dance_styles',
  'time_limits',
  'scoring_rubric',
  'awards',
] as const;

const settingCategorySchema = z.enum(settingCategories);

export const settingsRouter = router({
  /**
   * Get settings - Returns only active settings
   * Optional category filter
   */
  getSettings: protectedProcedure
    .input(
      z.object({
        category: settingCategorySchema.optional(),
      })
    )
    .query(async ({ input }) => {
      const settings = await prisma.competition_settings.findMany({
        where: {
          is_active: true,
          ...(input.category && { setting_category: input.category }),
        },
        orderBy: {
          display_order: 'asc',
        },
      });

      return { settings };
    }),

  /**
   * Get all settings (admin only)
   * Returns ALL settings including inactive ones
   */
  getAllSettings: adminProcedure.query(async () => {
    const settings = await prisma.competition_settings.findMany({
      orderBy: [{ setting_category: 'asc' }, { display_order: 'asc' }],
    });

    // Group by category for easier UI consumption
    const groupedSettings = settings.reduce((acc, setting) => {
      const category = setting.setting_category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {} as Record<string, typeof settings>);

    return { settings, groupedSettings };
  }),

  /**
   * Update settings (admin only)
   * Batch update all settings in a category
   */
  updateSettings: adminProcedure
    .input(
      z.object({
        category: settingCategorySchema,
        settings: z.array(
          z.object({
            key: z.string().min(1),
            value: z.any(), // JSONB value
            display_order: z.number().int().min(0),
            is_active: z.boolean(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const { category, settings } = input;

      // Use a transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Delete all existing settings in this category
        await tx.competition_settings.deleteMany({
          where: {
            setting_category: category,
          },
        });

        // Create new settings
        await tx.competition_settings.createMany({
          data: settings.map((setting) => ({
            setting_category: category,
            setting_key: setting.key,
            setting_value: setting.value,
            display_order: setting.display_order,
            is_active: setting.is_active,
          })),
        });
      });

      // Fetch and return updated settings
      const updatedSettings = await prisma.competition_settings.findMany({
        where: {
          setting_category: category,
        },
        orderBy: {
          display_order: 'asc',
        },
      });

      return { success: true, settings: updatedSettings };
    }),

  /**
   * Create setting (admin only)
   * Add a single new setting item
   */
  createSetting: adminProcedure
    .input(
      z.object({
        category: settingCategorySchema,
        key: z.string().min(1),
        value: z.any(), // JSONB value
        display_order: z.number().int().min(0).default(0),
        is_active: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const setting = await prisma.competition_settings.create({
        data: {
          setting_category: input.category,
          setting_key: input.key,
          setting_value: input.value,
          display_order: input.display_order,
          is_active: input.is_active,
        },
      });

      return { success: true, setting };
    }),

  /**
   * Delete setting (admin only)
   * Remove a setting by ID
   */
  deleteSetting: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      await prisma.competition_settings.delete({
        where: {
          id: input.id,
        },
      });

      return { success: true };
    }),
});
