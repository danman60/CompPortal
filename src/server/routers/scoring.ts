import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

/**
 * Scoring router for judge tablet interface
 * Handles score submission, updates, retrieval, and calculations
 *
 * Features:
 * - Submit and update judge scores (technical, artistic, performance)
 * - Automatic calculation of average scores across all judges
 * - Award level determination based on competition scoring ranges
 * - Category placement calculation within age groups
 * - Competition-wide recalculation support
 *
 * TODO: Replace publicProcedure with protectedProcedure once auth middleware is implemented
 * TODO: Get judge_id from auth context instead of requiring it as input
 */

/**
 * Helper function to calculate entry score and award level
 * Averages all final judge scores and determines award based on scoring ranges
 */
async function calculateEntryScore(entryId: string): Promise<void> {
  // Get all final scores for this entry
  const scores = await prisma.scores.findMany({
    where: {
      entry_id: entryId,
      is_final: true
    },
    select: { total_score: true },
  });

  if (scores.length === 0) {
    console.log(`No final scores found for entry ${entryId}`);
    return;
  }

  // Calculate average score
  const totalSum = scores.reduce((sum, s) => sum + Number(s.total_score), 0);
  const avgScore = totalSum / scores.length;

  console.log(`Entry ${entryId}: ${scores.length} scores, average: ${avgScore}`);

  // Get competition to check scoring ranges
  const entry = await prisma.competition_entries.findUnique({
    where: { id: entryId },
    select: {
      competition_id: true,
      category_id: true,
      age_group_id: true,
      classification_id: true,
      competitions: {
        select: {
          scoring_ranges: true,
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

  // Default scoring ranges (can be customized per competition)
  const defaultRanges = {
    platinum: [95, 100],
    high_gold: [90, 94.9],
    gold: [85, 89.9],
    silver: [80, 84.9],
    bronze: [70, 79.9],
  };

  // Use competition-specific ranges if available, otherwise use defaults
  const scoringRanges = entry.competitions.scoring_ranges || defaultRanges;

  // Determine award level based on score
  let awardLevel = 'Participation';

  for (const [level, range] of Object.entries(scoringRanges as Record<string, [number, number]>)) {
    const [min, max] = range;
    if (avgScore >= min && avgScore <= max) {
      // Convert snake_case to Title Case
      awardLevel = level
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      break;
    }
  }

  console.log(`Award level: ${awardLevel}`);

  // Update entry with calculated score and award level
  await prisma.competition_entries.update({
    where: { id: entryId },
    data: {
      calculated_score: avgScore,
      award_level: awardLevel,
    },
  });
}

/**
 * Calculate category placements for all entries in a category/age group
 */
async function calculateCategoryPlacements(
  competitionId: string,
  categoryId: string,
  ageGroupId: string,
  classificationId: string
): Promise<void> {
  // Get all entries in this category with scores
  const entries = await prisma.competition_entries.findMany({
    where: {
      competition_id: competitionId,
      category_id: categoryId,
      age_group_id: ageGroupId,
      classification_id: classificationId,
    },
    include: {
      scores: {
        where: { is_final: true },
        select: { total_score: true },
      },
    },
  });

  // Calculate average score for each entry
  const entriesWithAvg = entries
    .map(entry => {
      const scores = entry.scores;
      if (scores.length === 0) return null;

      const totalSum = scores.reduce((sum, s) => sum + Number(s.total_score), 0);
      const avgScore = totalSum / scores.length;

      return {
        id: entry.id,
        avgScore,
      };
    })
    .filter((e): e is { id: string; avgScore: number } => e !== null);

  // Sort by score descending
  entriesWithAvg.sort((a, b) => b.avgScore - a.avgScore);

  // Assign placements
  for (let i = 0; i < entriesWithAvg.length; i++) {
    const placement = i + 1;
    console.log(`Entry ${entriesWithAvg[i].id}: placement ${placement}, score ${entriesWithAvg[i].avgScore}`);

    await prisma.competition_entries.update({
      where: { id: entriesWithAvg[i].id },
      data: { category_placement: placement },
    });
  }
}

export const scoringRouter = router({
  /**
   * Submit a new score for an entry
   * Validates scores are 0-100
   *
   * @param judge_id - Judge ID (will come from auth context in future)
   * @param entry_id - Entry being scored
   * @param technical_score - Technical execution score (0-100)
   * @param artistic_score - Artistic impression score (0-100)
   * @param performance_score - Overall performance score (0-100)
   * @param comments - Optional judge comments
   */
  submitScore: publicProcedure
    .input(
      z.object({
        judge_id: z.string().uuid(),
        entry_id: z.string().uuid(),
        technical_score: z.number().min(0).max(100),
        artistic_score: z.number().min(0).max(100),
        performance_score: z.number().min(0).max(100),
        comments: z.string().optional(),
        special_awards: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify judge exists
      const judge = await prisma.judges.findUnique({
        where: { id: input.judge_id },
      });

      if (!judge) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Judge not found',
        });
      }

      // Verify entry exists
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.entry_id },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Entry not found',
        });
      }

      // Check if score already exists (prevent duplicates)
      const existingScore = await prisma.scores.findUnique({
        where: {
          entry_id_judge_id: {
            entry_id: input.entry_id,
            judge_id: input.judge_id,
          },
        },
      });

      if (existingScore) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Score already exists for this entry. Use updateScore to modify.',
        });
      }

      // Calculate total score
      const total_score =
        input.technical_score + input.artistic_score + input.performance_score;

      // Append special awards to comments if provided
      let finalComments = input.comments || '';
      if (input.special_awards && input.special_awards.length > 0) {
        const awardsText = `\n\n[Special Awards: ${input.special_awards.join(', ')}]`;
        finalComments = finalComments + awardsText;
      }

      // Create score
      const score = await prisma.scores.create({
        data: {
          entry_id: input.entry_id,
          judge_id: input.judge_id,
          technical_score: input.technical_score,
          artistic_score: input.artistic_score,
          performance_score: input.performance_score,
          total_score,
          comments: finalComments || undefined,
          is_final: true,
          scored_at: new Date(),
        },
        include: {
          judges: {
            select: {
              id: true,
              name: true,
              judge_number: true,
            },
          },
          competition_entries: {
            select: {
              id: true,
              entry_number: true,
              title: true,
            },
          },
        },
      });

      // Calculate average score and award level for this entry
      await calculateEntryScore(input.entry_id);

      return score;
    }),

  /**
   * Update an existing score
   * Validates that score belongs to the specified judge
   *
   * @param score_id - ID of score to update
   * @param judge_id - Judge ID (for verification, will come from auth context in future)
   * @param technical_score - Technical execution score (0-100)
   * @param artistic_score - Artistic impression score (0-100)
   * @param performance_score - Overall performance score (0-100)
   * @param comments - Optional judge comments
   */
  updateScore: publicProcedure
    .input(
      z.object({
        score_id: z.string().uuid(),
        judge_id: z.string().uuid(),
        technical_score: z.number().min(0).max(100),
        artistic_score: z.number().min(0).max(100),
        performance_score: z.number().min(0).max(100),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify score exists and belongs to this judge
      const existingScore = await prisma.scores.findUnique({
        where: { id: input.score_id },
      });

      if (!existingScore) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Score not found',
        });
      }

      if (existingScore.judge_id !== input.judge_id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own scores',
        });
      }

      // Calculate new total score
      const total_score =
        input.technical_score + input.artistic_score + input.performance_score;

      // Update score
      const score = await prisma.scores.update({
        where: { id: input.score_id },
        data: {
          technical_score: input.technical_score,
          artistic_score: input.artistic_score,
          performance_score: input.performance_score,
          total_score,
          comments: input.comments,
          modified_at: new Date(),
        },
        include: {
          judges: {
            select: {
              id: true,
              name: true,
              judge_number: true,
            },
          },
          competition_entries: {
            select: {
              id: true,
              entry_number: true,
              title: true,
            },
          },
        },
      });

      // Recalculate average score and award level for this entry
      await calculateEntryScore(existingScore.entry_id);

      return score;
    }),

  /**
   * Get all scores for a specific entry
   * Useful for viewing all judges' scores on an entry
   *
   * @param entry_id - Entry ID to get scores for
   */
  getScoresByEntry: publicProcedure
    .input(
      z.object({
        entry_id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const scores = await prisma.scores.findMany({
        where: { entry_id: input.entry_id },
        include: {
          judges: {
            select: {
              id: true,
              name: true,
              judge_number: true,
              credentials: true,
            },
          },
        },
        orderBy: {
          scored_at: 'desc',
        },
      });

      return scores;
    }),

  /**
   * Get scores for a specific judge
   * Optionally filter by competition_id
   *
   * @param judge_id - Judge ID (will come from auth context in future)
   * @param competition_id - Optional competition filter
   */
  getMyScores: publicProcedure
    .input(
      z.object({
        judge_id: z.string().uuid(),
        competition_id: z.string().uuid().optional(),
      })
    )
    .query(async ({ input }) => {
      // Verify judge exists
      const judge = await prisma.judges.findUnique({
        where: { id: input.judge_id },
      });

      if (!judge) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Judge not found',
        });
      }

      // Build where clause
      const where: any = {
        judge_id: input.judge_id,
      };

      // If competition_id provided, filter by entries in that competition
      if (input.competition_id) {
        where.competition_entries = {
          competition_id: input.competition_id,
        };
      }

      const scores = await prisma.scores.findMany({
        where,
        include: {
          competition_entries: {
            select: {
              id: true,
              entry_number: true,
              title: true,
              competition_id: true,
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
            },
          },
        },
        orderBy: {
          scored_at: 'desc',
        },
      });

      return scores;
    }),

  /**
   * Get all scores for a specific competition
   * Useful for scoreboard and analytics
   *
   * @param competition_id - Competition ID to get scores for
   */
  getScoresByCompetition: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const scores = await prisma.scores.findMany({
        where: {
          competition_entries: {
            competition_id: input.competition_id,
          },
        },
        include: {
          judges: {
            select: {
              id: true,
              name: true,
              judge_number: true,
            },
          },
          competition_entries: {
            select: {
              id: true,
              entry_number: true,
              title: true,
            },
          },
        },
        orderBy: {
          scored_at: 'desc',
        },
      });

      return scores;
    }),

  /**
   * Get scoreboard for a competition
   * Returns all entries with calculated scores, sorted by placement
   *
   * @param competition_id - Competition ID to get scoreboard for
   */
  getScoreboard: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const entries = await prisma.competition_entries.findMany({
        where: {
          competition_id: input.competition_id,
          calculated_score: { not: null },
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
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
          classifications: {
            select: {
              id: true,
              name: true,
            },
          },
          entry_size_categories: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { category_placement: 'asc' },
          { calculated_score: 'desc' },
        ],
      });

      return entries;
    }),

  /**
   * Calculate placements for a specific category
   * This will update category_placement for all entries in the category
   *
   * @param competition_id - Competition ID
   * @param category_id - Category ID
   * @param age_group_id - Age group ID
   * @param classification_id - Classification ID
   */
  calculatePlacements: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
        category_id: z.string().uuid(),
        age_group_id: z.string().uuid(),
        classification_id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      await calculateCategoryPlacements(
        input.competition_id,
        input.category_id,
        input.age_group_id,
        input.classification_id
      );

      return {
        success: true,
        message: 'Category placements calculated successfully',
      };
    }),

  /**
   * Recalculate all scores and placements for a competition
   * This will update calculated_score, award_level, and category_placement
   * for all entries in the competition
   *
   * @param competition_id - Competition ID
   */
  recalculateCompetition: publicProcedure
    .input(
      z.object({
        competition_id: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      // Get all entries in competition
      const entries = await prisma.competition_entries.findMany({
        where: { competition_id: input.competition_id },
        select: {
          id: true,
          category_id: true,
          age_group_id: true,
          classification_id: true,
        },
      });

      // Calculate scores for all entries
      for (const entry of entries) {
        await calculateEntryScore(entry.id);
      }

      // Get unique category/age/classification combinations
      const categories = new Set<string>();
      entries.forEach(entry => {
        const key = `${entry.category_id}|${entry.age_group_id}|${entry.classification_id}`;
        categories.add(key);
      });

      // Calculate placements for each category
      for (const categoryKey of categories) {
        const [category_id, age_group_id, classification_id] = categoryKey.split('|');
        await calculateCategoryPlacements(
          input.competition_id,
          category_id,
          age_group_id,
          classification_id
        );
      }

      return {
        success: true,
        message: `Recalculated scores and placements for ${entries.length} entries`,
        entriesProcessed: entries.length,
        categoriesProcessed: categories.size,
      };
    }),
});
