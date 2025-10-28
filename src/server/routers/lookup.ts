import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

export const lookupRouter = router({
  // Get all dance categories
  getCategories: publicProcedure.query(async () => {
    const categories = await prisma.dance_categories.findMany({
      where: {
        is_active: true,
      },
      orderBy: { sort_order: 'asc' },
    });

    return { categories };
  }),

  // Get all classifications
  getClassifications: publicProcedure.query(async () => {
    const classifications = await prisma.classifications.findMany({
      orderBy: { skill_level: 'asc' },
    });

    return { classifications };
  }),

  // Get all age groups
  getAgeGroups: publicProcedure.query(async () => {
    const ageGroups = await prisma.age_groups.findMany({
      orderBy: { sort_order: 'asc' },
    });

    return { ageGroups };
  }),

  // Get all entry size categories
  getEntrySizeCategories: publicProcedure.query(async () => {
    const entrySizeCategories = await prisma.entry_size_categories.findMany({
      orderBy: { sort_order: 'asc' },
    });

    return { entrySizeCategories };
  }),

  // Get all lookup data at once (for entry forms)
  // ARCHITECTURE_ISSUES.md: Tenant isolation fix for lookup tables
  getAllForEntry: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No tenant associated with user'
      });
    }

    console.log('[lookup.getAllForEntry] ctx.tenantId:', ctx.tenantId);

    const [categories, classifications, ageGroups, entrySizeCategories] = await Promise.all([
      prisma.dance_categories.findMany({
        where: {
          is_active: true,
          tenant_id: ctx.tenantId,
        },
        orderBy: { sort_order: 'asc' },
      }),
      prisma.classifications.findMany({
        where: { tenant_id: ctx.tenantId },
        orderBy: { skill_level: 'asc' },
      }),
      prisma.age_groups.findMany({
        where: { tenant_id: ctx.tenantId },
        orderBy: { sort_order: 'asc' },
      }),
      prisma.entry_size_categories.findMany({
        where: { tenant_id: ctx.tenantId },
        orderBy: { sort_order: 'asc' },
      }),
    ]);

    console.log('[lookup.getAllForEntry] ageGroups count:', ageGroups.length);
    console.log('[lookup.getAllForEntry] ageGroups tenant_ids:', ageGroups.map(a => a.tenant_id));
    console.log('[lookup.getAllForEntry] entrySizeCategories count:', entrySizeCategories.length);
    console.log('[lookup.getAllForEntry] entrySizeCategories:', entrySizeCategories.map(e => `${e.name} (${e.min_participants}-${e.max_participants}) tenant:${e.tenant_id}`));

    return {
      categories,
      classifications,
      ageGroups,
      entrySizeCategories,
    };
  }),
});
