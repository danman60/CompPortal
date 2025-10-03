import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';

/**
 * Scoring router for judge tablet interface
 * Handles score submission, updates, and retrieval
 *
 * TODO: Replace publicProcedure with protectedProcedure once auth middleware is implemented
 * TODO: Get judge_id from auth context instead of requiring it as input
 */
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

      // Create score
      const score = await prisma.scores.create({
        data: {
          entry_id: input.entry_id,
          judge_id: input.judge_id,
          technical_score: input.technical_score,
          artistic_score: input.artistic_score,
          performance_score: input.performance_score,
          total_score,
          comments: input.comments,
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
});
