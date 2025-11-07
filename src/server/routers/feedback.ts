/**
 * Feedback Router
 *
 * Handles user feedback submissions from SD and CD users.
 * Features:
 * - Submit feedback with optional star rating
 * - Daily digest emails to SA at 8am EST
 * - Feedback review panel for SA
 * - Login counter triggers feedback popup every 5th login
 *
 * Created: November 7, 2025
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

const feedbackTypeEnum = z.enum(['dream_feature', 'clunky_experience', 'bug_report', 'general']);

export const feedbackRouter = router({
  /**
   * Submit user feedback
   * Available to: SD, CD
   */
  submit: protectedProcedure
    .input(
      z.object({
        feedbackType: feedbackTypeEnum,
        starRating: z.number().int().min(1).max(5).optional(),
        comment: z.string().min(1).max(5000),
        pageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, tenantId, userRole } = ctx;

      // Only SD and CD can submit feedback
      if (!['studio_director', 'competition_director'].includes(userRole as string)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Studio Directors and Competition Directors can submit feedback',
        });
      }

      // Get user profile info
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: userId },
        select: {
          first_name: true,
          last_name: true,
        },
      });

      const userName = userProfile?.first_name && userProfile?.last_name
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : null;

      // Get user email from auth.users
      const authUser = await prisma.users.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      // Create feedback record
      const feedback = await prisma.user_feedback.create({
        data: {
          tenant_id: tenantId!,
          user_id: userId,
          user_role: userRole as string,
          user_email: authUser?.email || '',
          user_name: userName,
          feedback_type: input.feedbackType,
          star_rating: input.starRating,
          comment: input.comment.trim(),
          page_url: input.pageUrl,
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
          status: 'new',
        },
      });

      return {
        success: true,
        feedbackId: feedback.id,
        message: 'Thank you for your feedback! We review all submissions.',
      };
    }),

  /**
   * Get all feedback (SA only)
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(['new', 'reviewed', 'actioned', 'archived']).optional(),
        feedbackType: feedbackTypeEnum.optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Super admin only
      if (ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Super Admins can view all feedback',
        });
      }

      const where: any = {};
      if (input.status) where.status = input.status;
      if (input.feedbackType) where.feedback_type = input.feedbackType;

      const [feedback, total] = await Promise.all([
        prisma.user_feedback.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: input.limit,
          skip: input.offset,
          include: {
            tenants: {
              select: { name: true },
            },
          },
        }),
        prisma.user_feedback.count({ where }),
      ]);

      return {
        feedback,
        total,
        hasMore: total > input.offset + input.limit,
      };
    }),

  /**
   * Update feedback status (SA only)
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        feedbackId: z.string().uuid(),
        status: z.enum(['new', 'reviewed', 'actioned', 'archived']),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Super admin only
      if (ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Super Admins can update feedback status',
        });
      }

      const feedback = await prisma.user_feedback.update({
        where: { id: input.feedbackId },
        data: {
          status: input.status,
          admin_notes: input.adminNotes,
          reviewed_at: new Date(),
          reviewed_by: ctx.userId,
        },
      });

      return {
        success: true,
        feedback,
      };
    }),

  /**
   * Get feedback stats (SA only)
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Super admin only
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Super Admins can view feedback stats',
      });
    }

    const [total, newCount, byType, avgRating] = await Promise.all([
      prisma.user_feedback.count(),
      prisma.user_feedback.count({ where: { status: 'new' } }),
      prisma.user_feedback.groupBy({
        by: ['feedback_type'],
        _count: true,
      }),
      prisma.user_feedback.aggregate({
        _avg: { star_rating: true },
        where: { star_rating: { not: null } },
      }),
    ]);

    return {
      total,
      newCount,
      byType: byType.map((item) => ({
        type: item.feedback_type,
        count: item._count,
      })),
      averageRating: avgRating._avg.star_rating ? Number(avgRating._avg.star_rating.toFixed(1)) : null,
    };
  }),

  /**
   * Increment login count and check if feedback popup should show
   * Called on every login
   */
  checkFeedbackPrompt: protectedProcedure.mutation(async ({ ctx }) => {
    const { userId, userRole } = ctx;

    // Only for SD and CD
    if (!['studio_director', 'competition_director'].includes(userRole as string)) {
      return { shouldPrompt: false, loginCount: 0 };
    }

    // Increment login count
    const updatedProfile = await prisma.user_profiles.update({
      where: { id: userId },
      data: {
        login_count: {
          increment: 1,
        },
      },
      select: {
        login_count: true,
        last_feedback_prompt_at: true,
      },
    });

    const loginCount = updatedProfile.login_count || 0;
    const shouldPrompt = loginCount > 0 && loginCount % 5 === 0; // Every 5th login

    // Update last prompt timestamp if showing
    if (shouldPrompt) {
      await prisma.user_profiles.update({
        where: { id: userId },
        data: {
          last_feedback_prompt_at: new Date(),
        },
      });
    }

    return {
      shouldPrompt,
      loginCount,
    };
  }),
});
