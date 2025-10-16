import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import {
  EMPWR_AGE_DIVISIONS,
  EMPWR_ENTRY_SIZE_CATEGORIES,
  EMPWR_ENTRY_FEES,
  EMPWR_CLASSIFICATIONS,
  EMPWR_DANCE_CATEGORIES,
  EMPWR_SCORING_SYSTEM,
  type AgeDivisionSettings,
  type EntrySizeSettings,
  type EntryFeeSettings,
  type ClassificationSettings,
  type DanceCategorySettings,
  type ScoringSystemSettings,
} from '@/lib/empwrDefaults';

/**
 * Tenant Settings Router - Tenant-Wide Competition Configuration
 *
 * Manages tenant-wide default settings that apply to all competitions
 * within a tenant unless overridden at the competition level.
 *
 * Settings include:
 * - Age Divisions (Micro, Mini, Junior, Intermediate, Senior, Adult)
 * - Entry Size Categories (Solo, Duet/Trio, Small Group, Large Group, Line, Super Line)
 * - Entry Fees (pricing per category)
 * - Classifications (Novice, Part-Time, Competitive)
 * - Dance Categories (Ballet, Jazz, Tap, Contemporary, etc.)
 * - Scoring System (Bronze, Silver, Gold, Titanium, Platinum, Pandora)
 */

// Zod schemas for validation
const ageDivisionSchema = z.object({
  name: z.string(),
  shortName: z.string(),
  minAge: z.number().int().min(0),
  maxAge: z.number().int().min(0),
});

const entrySizeCategorySchema = z.object({
  name: z.string(),
  minDancers: z.number().int().min(1),
  maxDancers: z.number().int().min(1),
  baseFee: z.number().optional(),
  perDancerFee: z.number().optional(),
  description: z.string().optional(),
});

const entryFeeSchema = z.object({
  fees: z.object({
    solo: z.number(),
    duetTrio: z.number(),
    group: z.number(),
    titleUpgrade: z.number(),
  }),
  currency: z.string(),
  description: z.string().optional(),
});

const classificationSchema = z.object({
  name: z.string(),
  description: z.string(),
  rules: z.string(),
});

const danceCategorySchema = z.object({
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
});

const scoringTierSchema = z.object({
  name: z.string(),
  minScore: z.number(),
  maxScore: z.number(),
  color: z.string(),
});

const danceStyleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

const scoreLevelSchema = z.object({
  name: z.string(),
  minScore: z.number(),
  maxScore: z.number(),
  color: z.string().optional(),
});

const awardCategorySchema = z.object({
  categoryName: z.string(),
  topN: z.number().int().min(1),
});

export const tenantSettingsRouter = router({
  /**
   * Get tenant settings
   * Returns all tenant-wide settings for the current tenant
   */
  getTenantSettings: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Verify user has access to this tenant
      if (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this tenant',
        });
      }

      const tenant = await prisma.tenants.findUnique({
        where: {
          id: input.tenantId,
        },
        select: {
          id: true,
          name: true,
          age_division_settings: true,
          entry_size_settings: true,
          entry_fee_settings: true,
          classification_settings: true,
          dance_category_settings: true,
          scoring_system_settings: true,
        },
      });

      if (!tenant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tenant not found',
        });
      }

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        settings: {
          ageDivisions: tenant.age_division_settings as AgeDivisionSettings | null,
          entrySizeCategories: tenant.entry_size_settings as EntrySizeSettings | null,
          entryFees: tenant.entry_fee_settings as EntryFeeSettings | null,
          classifications: tenant.classification_settings as ClassificationSettings | null,
          danceCategories: tenant.dance_category_settings as DanceCategorySettings | null,
          scoringSystem: tenant.scoring_system_settings as ScoringSystemSettings | null,
          danceStyles: tenant.dance_category_settings as any, // Simplified dance styles
          scoringRubric: tenant.scoring_system_settings as any, // Score ranges
          awards: (tenant as any).award_settings as any, // Overall awards
        },
      };
    }),

  /**
   * Update age division settings
   */
  updateAgeDivisions: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        divisions: z.array(ageDivisionSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      const settings = {
        divisions: input.divisions,
      };

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          age_division_settings: settings as any,
        },
      });

      return { success: true, settings };
    }),

  /**
   * Update entry size category settings
   */
  updateEntrySizeCategories: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        categories: z.array(entrySizeCategorySchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      const settings = {
        categories: input.categories,
      };

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          entry_size_settings: settings as any,
        },
      });

      return { success: true, settings };
    }),

  /**
   * Update entry fee settings
   */
  updateEntryFees: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        fees: entryFeeSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          entry_fee_settings: input.fees as any,
        },
      });

      return { success: true, settings: input.fees };
    }),

  /**
   * Update classification settings
   */
  updateClassifications: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        classifications: z.array(classificationSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      const settings = {
        classifications: input.classifications,
      };

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          classification_settings: settings as any,
        },
      });

      return { success: true, settings };
    }),

  /**
   * Update dance category settings
   */
  updateDanceCategories: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        styles: z.array(danceCategorySchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      const settings = {
        styles: input.styles,
      };

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          dance_category_settings: settings as any,
        },
      });

      return { success: true, settings };
    }),

  /**
   * Update scoring system settings
   */
  updateScoringSystem: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        tiers: z.array(scoringTierSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      const settings = {
        tiers: input.tiers,
        description: 'Score ranges for award levels',
      };

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          scoring_system_settings: settings as any,
        },
      });

      return { success: true, settings };
    }),

  /**
   * Update dance styles
   */
  updateDanceStyles: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        danceStyles: z.array(danceStyleSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      const settings = {
        styles: input.danceStyles,
      };

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          dance_category_settings: settings as any,
        },
      });

      return { success: true, settings };
    }),

  /**
   * Update scoring rubric
   */
  updateScoringRubric: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        scoringRubric: z.array(scoreLevelSchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      const settings = {
        tiers: input.scoringRubric,
        description: 'Score ranges for award levels',
      };

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          scoring_system_settings: settings as any,
        },
      });

      return { success: true, settings };
    }),

  /**
   * Update awards
   */
  updateAwards: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
        awards: z.array(awardCategorySchema),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      const settings = {
        awards: input.awards,
      };

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          award_settings: settings as any,
        },
      });

      return { success: true, settings };
    }),

  /**
   * Load EMPWR defaults
   * Populates tenant settings with EMPWR Dance Competition defaults
   */
  loadEmpwrDefaults: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify user has access and is competition director or super admin
      if (ctx.userRole === 'studio_director' || (ctx.tenantId !== input.tenantId && ctx.userRole !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors and Super Admins can modify tenant settings',
        });
      }

      await prisma.tenants.update({
        where: {
          id: input.tenantId,
        },
        data: {
          age_division_settings: EMPWR_AGE_DIVISIONS as any,
          entry_size_settings: EMPWR_ENTRY_SIZE_CATEGORIES as any,
          entry_fee_settings: EMPWR_ENTRY_FEES as any,
          classification_settings: EMPWR_CLASSIFICATIONS as any,
          dance_category_settings: EMPWR_DANCE_CATEGORIES as any,
          scoring_system_settings: EMPWR_SCORING_SYSTEM as any,
        },
      });

      return {
        success: true,
        message: 'EMPWR defaults loaded successfully',
        settings: {
          ageDivisions: EMPWR_AGE_DIVISIONS,
          entrySizeCategories: EMPWR_ENTRY_SIZE_CATEGORIES,
          entryFees: EMPWR_ENTRY_FEES,
          classifications: EMPWR_CLASSIFICATIONS,
          danceCategories: EMPWR_DANCE_CATEGORIES,
          scoringSystem: EMPWR_SCORING_SYSTEM,
        },
      };
    }),

  /**
   * Get EMPWR defaults (preview without saving)
   */
  getEmpwrDefaults: protectedProcedure.query(async () => {
    return {
      ageDivisions: EMPWR_AGE_DIVISIONS,
      entrySizeCategories: EMPWR_ENTRY_SIZE_CATEGORIES,
      entryFees: EMPWR_ENTRY_FEES,
      classifications: EMPWR_CLASSIFICATIONS,
      danceCategories: EMPWR_DANCE_CATEGORIES,
      scoringSystem: EMPWR_SCORING_SYSTEM,
    };
  }),
});
