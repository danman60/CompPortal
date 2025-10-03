import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

/**
 * Analytics router for competition insights and metrics
 * Provides aggregated data for dashboards and reporting
 */
export const analyticsRouter = router({
  /**
   * Get competition overview statistics
   */
  getCompetitionStats: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      // Verify competition exists
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competition_id },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Get entry counts by category
      const entriesByCategory = await prisma.competition_entries.groupBy({
        by: ['category_id'],
        where: { competition_id: input.competition_id },
        _count: true,
      });

      // Get category details
      const categories = await prisma.dance_categories.findMany({
        where: {
          id: {
            in: entriesByCategory.map((e) => e.category_id),
          },
        },
      });

      const categoryStats = entriesByCategory.map((stat) => {
        const category = categories.find((c) => c.id === stat.category_id);
        return {
          category_id: stat.category_id,
          category_name: category?.name || 'Unknown',
          entry_count: stat._count,
        };
      });

      // Get entries by studio
      const entriesByStudio = await prisma.competition_entries.groupBy({
        by: ['studio_id'],
        where: { competition_id: input.competition_id },
        _count: true,
      });

      // Get studio details
      const studios = await prisma.studios.findMany({
        where: {
          id: {
            in: entriesByStudio.map((e) => e.studio_id),
          },
        },
      });

      const studioStats = entriesByStudio.map((stat) => {
        const studio = studios.find((s) => s.id === stat.studio_id);
        return {
          studio_id: stat.studio_id,
          studio_name: studio?.name || 'Unknown',
          entry_count: stat._count,
        };
      });

      // Get entries by age group
      const entriesByAgeGroup = await prisma.competition_entries.groupBy({
        by: ['age_group_id'],
        where: { competition_id: input.competition_id },
        _count: true,
      });

      // Get age group details
      const ageGroups = await prisma.age_groups.findMany({
        where: {
          id: {
            in: entriesByAgeGroup.map((e) => e.age_group_id),
          },
        },
      });

      const ageGroupStats = entriesByAgeGroup.map((stat) => {
        const ageGroup = ageGroups.find((ag) => ag.id === stat.age_group_id);
        return {
          age_group_id: stat.age_group_id,
          age_group_name: ageGroup?.name || 'Unknown',
          entry_count: stat._count,
        };
      });

      // Get total entries
      const totalEntries = await prisma.competition_entries.count({
        where: { competition_id: input.competition_id },
      });

      // Get total studios (unique)
      const totalStudios = await prisma.competition_entries.findMany({
        where: { competition_id: input.competition_id },
        distinct: ['studio_id'],
        select: { studio_id: true },
      });

      // Get total dancers (unique)
      const totalDancers = await prisma.entry_participants.findMany({
        where: {
          competition_entries: {
            competition_id: input.competition_id,
          },
        },
        distinct: ['dancer_id'],
        select: { dancer_id: true },
      });

      // Get scoring progress
      const totalScores = await prisma.scores.count({
        where: {
          competition_entries: {
            competition_id: input.competition_id,
          },
        },
      });

      const judgesAssigned = await prisma.judges.count({
        where: { competition_id: input.competition_id },
      });

      const expectedScores = totalEntries * judgesAssigned;
      const scoringProgress = expectedScores > 0 ? (totalScores / expectedScores) * 100 : 0;

      return {
        competition,
        totalEntries,
        totalStudios: totalStudios.length,
        totalDancers: totalDancers.length,
        totalScores,
        judgesAssigned,
        scoringProgress: Math.round(scoringProgress),
        categoryStats,
        studioStats,
        ageGroupStats,
      };
    }),

  /**
   * Get revenue analytics
   */
  getRevenueStats: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      // Get all entries with fees
      const entries = await prisma.competition_entries.findMany({
        where: { competition_id: input.competition_id },
        select: {
          id: true,
          entry_fee: true,
          late_fee: true,
          total_fee: true,
          studios: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Calculate totals
      const totalRevenue = entries.reduce((sum, entry) => {
        return sum + (Number(entry.total_fee) || 0);
      }, 0);

      const totalEntryFees = entries.reduce((sum, entry) => {
        return sum + (Number(entry.entry_fee) || 0);
      }, 0);

      const totalLateFees = entries.reduce((sum, entry) => {
        return sum + (Number(entry.late_fee) || 0);
      }, 0);

      // Revenue by studio
      const studioRevenue: { [key: string]: { name: string; revenue: number; entries: number } } = {};

      entries.forEach((entry) => {
        const studioId = entry.studios?.id || 'unknown';
        const studioName = entry.studios?.name || 'Unknown';
        const revenue = Number(entry.total_fee) || 0;

        if (!studioRevenue[studioId]) {
          studioRevenue[studioId] = { name: studioName, revenue: 0, entries: 0 };
        }

        studioRevenue[studioId].revenue += revenue;
        studioRevenue[studioId].entries += 1;
      });

      const revenueByStudio = Object.entries(studioRevenue)
        .map(([studio_id, data]) => ({
          studio_id,
          studio_name: data.name,
          revenue: data.revenue,
          entry_count: data.entries,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        totalRevenue,
        totalEntryFees,
        totalLateFees,
        averageEntryFee: entries.length > 0 ? totalRevenue / entries.length : 0,
        revenueByStudio,
      };
    }),

  /**
   * Get judge performance metrics
   */
  getJudgeStats: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      // Get all judges for competition
      const judges = await prisma.judges.findMany({
        where: { competition_id: input.competition_id },
        include: {
          scores: {
            where: {
              competition_entries: {
                competition_id: input.competition_id,
              },
            },
          },
        },
      });

      const judgeStats = judges.map((judge) => {
        const scores = judge.scores;
        const totalScores = scores.length;

        const avgTechnical = scores.length > 0
          ? scores.reduce((sum, s) => sum + (Number(s.technical_score) || 0), 0) / scores.length
          : 0;

        const avgArtistic = scores.length > 0
          ? scores.reduce((sum, s) => sum + (Number(s.artistic_score) || 0), 0) / scores.length
          : 0;

        const avgPerformance = scores.length > 0
          ? scores.reduce((sum, s) => sum + (Number(s.performance_score) || 0), 0) / scores.length
          : 0;

        const avgTotal = scores.length > 0
          ? scores.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0) / scores.length
          : 0;

        return {
          judge_id: judge.id,
          judge_name: judge.name,
          judge_number: judge.judge_number,
          total_scores: totalScores,
          avg_technical: avgTechnical,
          avg_artistic: avgArtistic,
          avg_performance: avgPerformance,
          avg_total: avgTotal,
          checked_in: judge.checked_in,
        };
      });

      return judgeStats;
    }),

  /**
   * Get top performers
   */
  getTopPerformers: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      // Get all entries with their scores
      const entries = await prisma.competition_entries.findMany({
        where: { competition_id: input.competition_id },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
            },
          },
          dance_categories: {
            select: {
              id: true,
              name: true,
            },
          },
          age_groups: {
            select: {
              id: true,
              name: true,
            },
          },
          scores: {
            select: {
              total_score: true,
            },
          },
        },
      });

      // Calculate average scores
      const entriesWithAvg = entries
        .map((entry) => {
          const scores = entry.scores;
          const avgScore = scores.length > 0
            ? scores.reduce((sum, s) => sum + (Number(s.total_score) || 0), 0) / scores.length
            : 0;

          return {
            entry_id: entry.id,
            entry_number: entry.entry_number,
            title: entry.title,
            studio_name: entry.studios?.name || 'Unknown',
            category_name: entry.dance_categories?.name || 'Unknown',
            age_group_name: entry.age_groups?.name || 'Unknown',
            average_score: avgScore,
            judge_count: scores.length,
          };
        })
        .filter((e) => e.judge_count > 0) // Only entries with scores
        .sort((a, b) => b.average_score - a.average_score)
        .slice(0, input.limit);

      return entriesWithAvg;
    }),

  /**
   * Get overall system metrics (admin dashboard)
   */
  getSystemStats: publicProcedure.query(async () => {
    const [
      totalCompetitions,
      totalStudios,
      totalDancers,
      totalEntries,
      totalScores,
    ] = await Promise.all([
      prisma.competitions.count(),
      prisma.studios.count(),
      prisma.dancers.count(),
      prisma.competition_entries.count(),
      prisma.scores.count(),
    ]);

    // Get competitions by status
    const competitionsByStatus = await prisma.competitions.groupBy({
      by: ['status'],
      _count: true,
    });

    // Get studios by status
    const studiosByStatus = await prisma.studios.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      totalCompetitions,
      totalStudios,
      totalDancers,
      totalEntries,
      totalScores,
      competitionsByStatus,
      studiosByStatus,
    };
  }),
});
