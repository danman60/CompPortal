import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';

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
  getAllForEntry: publicProcedure.query(async () => {
    const [categories, classifications, ageGroups, entrySizeCategories] = await Promise.all([
      prisma.dance_categories.findMany({
        where: { is_active: true },
        orderBy: { sort_order: 'asc' },
      }),
      prisma.classifications.findMany({
        orderBy: { skill_level: 'asc' },
      }),
      prisma.age_groups.findMany({
        orderBy: { sort_order: 'asc' },
      }),
      prisma.entry_size_categories.findMany({
        orderBy: { sort_order: 'asc' },
      }),
    ]);

    return {
      categories,
      classifications,
      ageGroups,
      entrySizeCategories,
    };
  }),
});
