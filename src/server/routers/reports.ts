import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import {
  generateEntryScoreSheet,
  generateCategoryResultsReport,
  generateJudgeScorecardReport,
  generateCompetitionSummaryReport,
} from '@/lib/pdf-reports';

/**
 * Reports router for PDF generation
 * Generates professional competition reports and scorecards
 */
export const reportsRouter = router({
  /**
   * Generate Entry Score Sheet PDF
   * Shows individual entry with all judge scores, average, and award level
   */
  generateEntryScoreSheet: publicProcedure
    .input(
      z.object({
        entry_id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch entry with all related data
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.entry_id },
        include: {
          competitions: {
            select: {
              name: true,
              competition_start_date: true,
              competition_end_date: true,
            },
          },
          studios: {
            select: {
              name: true,
            },
          },
          dance_categories: {
            select: {
              name: true,
            },
          },
          age_groups: {
            select: {
              name: true,
            },
          },
          entry_participants: {
            include: {
              dancers: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          scores: {
            include: {
              judges: {
                select: {
                  name: true,
                  judge_number: true,
                },
              },
            },
          },
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Entry not found',
        });
      }

      // Calculate average score
      const averageScore =
        entry.scores.length > 0
          ? entry.scores.reduce((sum, s) => sum + Number(s.total_score), 0) /
            entry.scores.length
          : 0;

      // Determine award level (simplified logic - can be enhanced)
      let awardLevel = 'Not Scored';
      if (averageScore >= 270) awardLevel = 'Platinum';
      else if (averageScore >= 255) awardLevel = 'High Gold';
      else if (averageScore >= 240) awardLevel = 'Gold';
      else if (averageScore >= 210) awardLevel = 'Silver';
      else if (averageScore > 0) awardLevel = 'Bronze';

      // Format competition dates
      const startDate = entry.competitions.competition_start_date
        ? new Date(entry.competitions.competition_start_date).toLocaleDateString()
        : '';
      const endDate = entry.competitions.competition_end_date
        ? new Date(entry.competitions.competition_end_date).toLocaleDateString()
        : '';
      const dates =
        startDate && endDate ? `${startDate} - ${endDate}` : startDate || 'TBD';

      // Generate PDF
      const pdfBlob = generateEntryScoreSheet({
        competition: {
          name: entry.competitions.name,
          dates,
        },
        entry: {
          entry_number: entry.entry_number || 0,
          title: entry.title,
          studio_name: entry.studios.name,
          category: entry.dance_categories?.name || 'Unknown',
          age_group: entry.age_groups?.name || 'Unknown',
          dancers: entry.entry_participants.map(
            (p) => `${p.dancers.first_name} ${p.dancers.last_name}`
          ),
        },
        scores: entry.scores.map((score) => ({
          judge_name: score.judges.name,
          judge_number: String(score.judges.judge_number || ''),
          technical_score: Number(score.technical_score),
          artistic_score: Number(score.artistic_score),
          performance_score: Number(score.performance_score),
          total_score: Number(score.total_score),
          comments: score.comments || undefined,
        })),
        average_score: averageScore,
        award_level: awardLevel,
      });

      // Convert blob to base64 for transmission
      const buffer = await pdfBlob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        filename: `entry-${entry.entry_number}-scoresheet.pdf`,
        data: base64,
        mimeType: 'application/pdf',
      };
    }),

  /**
   * Generate Category Results Report PDF
   * Shows rankings within a specific category and age group
   */
  generateCategoryResults: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
        category_id: z.string().uuid(),
        age_group_id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch competition
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competition_id },
        select: {
          name: true,
          competition_start_date: true,
          competition_end_date: true,
        },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Fetch category and age group names
      const category = await prisma.dance_categories.findUnique({
        where: { id: input.category_id },
      });

      const ageGroup = await prisma.age_groups.findUnique({
        where: { id: input.age_group_id },
      });

      // Fetch all entries in this category/age group with scores
      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competition_id,
          category_id: input.category_id,
          age_group_id: input.age_group_id,
        },
        include: {
          studios: {
            select: {
              name: true,
            },
          },
          scores: true,
        },
      });

      // Calculate average scores and sort by placement
      const entriesWithScores = entries
        .map((entry) => {
          const avgScore =
            entry.scores.length > 0
              ? entry.scores.reduce((sum, s) => sum + Number(s.total_score), 0) /
                entry.scores.length
              : 0;

          let awardLevel = 'Not Scored';
          if (avgScore >= 270) awardLevel = 'Platinum';
          else if (avgScore >= 255) awardLevel = 'High Gold';
          else if (avgScore >= 240) awardLevel = 'Gold';
          else if (avgScore >= 210) awardLevel = 'Silver';
          else if (avgScore > 0) awardLevel = 'Bronze';

          return {
            entry_number: entry.entry_number || 0,
            title: entry.title,
            studio_name: entry.studios.name,
            average_score: avgScore,
            award_level: awardLevel,
          };
        })
        .filter((e) => e.average_score > 0) // Only include scored entries
        .sort((a, b) => b.average_score - a.average_score) // Sort by score descending
        .map((entry, index) => ({
          ...entry,
          placement: index + 1,
        }));

      if (entriesWithScores.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No scored entries found in this category',
        });
      }

      // Format dates
      const startDate = competition.competition_start_date
        ? new Date(competition.competition_start_date).toLocaleDateString()
        : '';
      const endDate = competition.competition_end_date
        ? new Date(competition.competition_end_date).toLocaleDateString()
        : '';
      const dates =
        startDate && endDate ? `${startDate} - ${endDate}` : startDate || 'TBD';

      // Generate PDF
      const pdfBlob = generateCategoryResultsReport({
        competition: {
          name: competition.name,
          dates,
        },
        category: category?.name || 'Unknown',
        age_group: ageGroup?.name || 'Unknown',
        entries: entriesWithScores,
      });

      const buffer = await pdfBlob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        filename: `results-${category?.name}-${ageGroup?.name}.pdf`,
        data: base64,
        mimeType: 'application/pdf',
      };
    }),

  /**
   * Generate Judge Scorecard PDF
   * Shows all scores submitted by a specific judge
   */
  generateJudgeScorecard: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
        judge_id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch competition
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competition_id },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Fetch judge
      const judge = await prisma.judges.findUnique({
        where: { id: input.judge_id },
      });

      if (!judge) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Judge not found',
        });
      }

      // Fetch all scores by this judge for this competition
      const scores = await prisma.scores.findMany({
        where: {
          judge_id: input.judge_id,
          competition_entries: {
            competition_id: input.competition_id,
          },
        },
        include: {
          competition_entries: {
            include: {
              dance_categories: true,
            },
          },
        },
        orderBy: {
          scored_at: 'asc',
        },
      });

      if (scores.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No scores found for this judge',
        });
      }

      // Format dates
      const startDate = competition.competition_start_date
        ? new Date(competition.competition_start_date).toLocaleDateString()
        : '';
      const endDate = competition.competition_end_date
        ? new Date(competition.competition_end_date).toLocaleDateString()
        : '';
      const dates =
        startDate && endDate ? `${startDate} - ${endDate}` : startDate || 'TBD';

      // Generate PDF
      const pdfBlob = generateJudgeScorecardReport({
        competition: {
          name: competition.name,
          dates,
        },
        judge: {
          name: judge.name,
          judge_number: String(judge.judge_number || ''),
          credentials: judge.credentials || 'No credentials listed',
        },
        scores: scores.map((score) => ({
          entry_number: score.competition_entries.entry_number || 0,
          title: score.competition_entries.title,
          category: score.competition_entries.dance_categories?.name || 'Unknown',
          technical_score: Number(score.technical_score),
          artistic_score: Number(score.artistic_score),
          performance_score: Number(score.performance_score),
          total_score: Number(score.total_score),
        })),
      });

      const buffer = await pdfBlob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        filename: `judge-${judge.judge_number}-scorecard.pdf`,
        data: base64,
        mimeType: 'application/pdf',
      };
    }),

  /**
   * Generate Competition Summary Report PDF
   * Shows overall statistics and highlights
   */
  generateCompetitionSummary: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch competition with related data
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competition_id },
        include: {
          competition_locations: true,
          competition_entries: {
            include: {
              entry_participants: true,
              studios: true,
              dance_categories: true,
              age_groups: true,
              scores: true,
            },
          },
        },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Calculate statistics
      const totalEntries = competition.competition_entries.length;
      const uniqueStudios = new Set(competition.competition_entries.map((e) => e.studio_id));
      const totalStudios = uniqueStudios.size;

      const uniqueDancers = new Set(
        competition.competition_entries.flatMap((e) =>
          e.entry_participants.map((p) => p.dancer_id)
        )
      );
      const totalDancers = uniqueDancers.size;

      // Category breakdown
      const categoryMap = new Map<string, number>();
      competition.competition_entries.forEach((entry) => {
        const catName = entry.dance_categories?.name || 'Unknown';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
      });
      const categories = Array.from(categoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Age group breakdown
      const ageGroupMap = new Map<string, number>();
      competition.competition_entries.forEach((entry) => {
        const ageName = entry.age_groups?.name || 'Unknown';
        ageGroupMap.set(ageName, (ageGroupMap.get(ageName) || 0) + 1);
      });
      const ageGroups = Array.from(ageGroupMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Award distribution (simplified)
      const awardMap = new Map<string, number>();
      competition.competition_entries.forEach((entry) => {
        const avgScore =
          entry.scores.length > 0
            ? entry.scores.reduce((sum, s) => sum + Number(s.total_score), 0) /
              entry.scores.length
            : 0;

        let awardLevel = 'Not Scored';
        if (avgScore >= 270) awardLevel = 'Platinum';
        else if (avgScore >= 255) awardLevel = 'High Gold';
        else if (avgScore >= 240) awardLevel = 'Gold';
        else if (avgScore >= 210) awardLevel = 'Silver';
        else if (avgScore > 0) awardLevel = 'Bronze';

        awardMap.set(awardLevel, (awardMap.get(awardLevel) || 0) + 1);
      });
      const awardDistribution = Array.from(awardMap.entries())
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => {
          const order = ['Platinum', 'High Gold', 'Gold', 'Silver', 'Bronze', 'Not Scored'];
          return order.indexOf(a.level) - order.indexOf(b.level);
        });

      // Format dates
      const startDate = competition.competition_start_date
        ? new Date(competition.competition_start_date).toLocaleDateString()
        : '';
      const endDate = competition.competition_end_date
        ? new Date(competition.competition_end_date).toLocaleDateString()
        : '';
      const dates =
        startDate && endDate ? `${startDate} - ${endDate}` : startDate || 'TBD';

      // Generate PDF
      const pdfBlob = generateCompetitionSummaryReport({
        competition: {
          name: competition.name,
          dates,
          location:
            competition.competition_locations?.[0]?.name ||
            competition.competition_locations?.[0]?.address ||
            'Location TBD',
        },
        statistics: {
          total_entries: totalEntries,
          total_studios: totalStudios,
          total_dancers: totalDancers,
          categories,
          age_groups: ageGroups,
          award_distribution: awardDistribution,
        },
      });

      const buffer = await pdfBlob.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      return {
        filename: `summary-${competition.name.replace(/\s+/g, '-')}.pdf`,
        data: base64,
        mimeType: 'application/pdf',
      };
    }),

  /**
   * Get available categories and age groups for a competition
   * Helper endpoint for the reports UI
   */
  getReportOptions: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      // Get unique categories with entries
      const categories = await prisma.competition_entries.findMany({
        where: { competition_id: input.competition_id },
        select: {
          dance_categories: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        distinct: ['category_id'],
      });

      // Get unique age groups with entries
      const ageGroups = await prisma.competition_entries.findMany({
        where: { competition_id: input.competition_id },
        select: {
          age_groups: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        distinct: ['age_group_id'],
      });

      // Get judges assigned to this competition
      const judges = await prisma.judges.findMany({
        where: {
          competition_id: input.competition_id,
        },
        select: {
          id: true,
          name: true,
          judge_number: true,
        },
      });

      // Get entries for individual score sheets
      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competition_id,
        },
        select: {
          id: true,
          entry_number: true,
          title: true,
        },
        orderBy: {
          entry_number: 'asc',
        },
      });

      return {
        categories: categories
          .map((c) => c.dance_categories)
          .filter((c) => c !== null)
          .sort((a, b) => a!.name.localeCompare(b!.name)),
        age_groups: ageGroups
          .map((a) => a.age_groups)
          .filter((a) => a !== null)
          .sort((a, b) => a!.name.localeCompare(b!.name)),
        judges: judges.sort((a, b) => String(a.judge_number || '').localeCompare(String(b.judge_number || ''))),
        entries: entries.filter((e) => e.entry_number !== null),
      };
    }),
});
