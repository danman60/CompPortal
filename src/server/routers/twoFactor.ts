/**
 * Two-Factor Authentication tRPC Router
 * Manages 2FA setup, verification, and administration
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  generateSecret,
  generateQRCode,
  generateBackupCodes,
  setup2FA,
  enable2FA,
  disable2FA,
  is2FAEnabled,
  verify2FA,
  verifyToken,
  get2FASecret,
  log2FAAction,
  get2FAAuditLog,
  getRemainingBackupCodeCount,
  regenerateBackupCodes,
  formatBackupCodesForDisplay,
} from '@/lib/two-factor';
import { prisma } from '@/lib/prisma';

export const twoFactorRouter = router({
  /**
   * Check if user has 2FA enabled
   */
  getStatus: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to check 2FA status',
      });
    }

    const enabled = await is2FAEnabled(ctx.userId);
    const backupCodeCount = enabled
      ? await getRemainingBackupCodeCount(ctx.userId)
      : 0;

    return {
      enabled,
      backupCodeCount,
    };
  }),

  /**
   * Start 2FA setup process
   * Returns secret and QR code for user to scan
   */
  startSetup: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to set up 2FA',
      });
    }

    // Get user email
    const user = await prisma.users.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    });

    if (!user?.email) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User email not found',
      });
    }

    const secret = generateSecret();
    const qrCode = await generateQRCode(user.email, secret);
    const backupCodes = generateBackupCodes();

    return {
      secret,
      qrCode,
      backupCodes,
      formattedBackupCodes: formatBackupCodesForDisplay(backupCodes),
    };
  }),

  /**
   * Verify 2FA setup and enable it
   */
  verifySetup: publicProcedure
    .input(
      z.object({
        secret: z.string().min(16),
        token: z.string().length(6),
        backupCodes: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to set up 2FA',
        });
      }

      // Verify token
      if (!verifyToken(input.token, input.secret)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid verification code. Please try again.',
        });
      }

      // Setup 2FA
      await setup2FA({
        userId: ctx.userId,
        secret: input.secret,
        backupCodes: input.backupCodes,
      });

      // Enable 2FA
      await enable2FA(ctx.userId);

      // Log setup action
      await log2FAAction({
        userId: ctx.userId,
        action: 'setup',
        success: true,
      });

      return {
        success: true,
        message: '2FA enabled successfully',
      };
    }),

  /**
   * Verify 2FA token during login
   */
  verify: publicProcedure
    .input(
      z.object({
        token: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to verify 2FA',
        });
      }

      const result = await verify2FA({
        userId: ctx.userId,
        token: input.token,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid verification code',
        });
      }

      return {
        success: true,
        backupCodeUsed: result.backupCodeUsed,
      };
    }),

  /**
   * Disable 2FA
   */
  disable: publicProcedure
    .input(
      z.object({
        token: z.string().length(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to disable 2FA',
        });
      }

      // Verify token before disabling
      const secret = await get2FASecret(ctx.userId);

      if (!secret || !verifyToken(input.token, secret)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid verification code',
        });
      }

      await disable2FA(ctx.userId);

      await log2FAAction({
        userId: ctx.userId,
        action: 'disable',
        success: true,
      });

      return {
        success: true,
        message: '2FA disabled successfully',
      };
    }),

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes: publicProcedure
    .input(
      z.object({
        token: z.string().length(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to regenerate backup codes',
        });
      }

      // Verify token before regenerating
      const secret = await get2FASecret(ctx.userId);

      if (!secret || !verifyToken(input.token, secret)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid verification code',
        });
      }

      const newCodes = await regenerateBackupCodes(ctx.userId);

      return {
        success: true,
        backupCodes: newCodes,
        formattedBackupCodes: formatBackupCodesForDisplay(newCodes),
      };
    }),

  /**
   * Get 2FA audit log
   */
  getAuditLog: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
        })
        .nullish()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view 2FA audit log',
        });
      }

      const limit = input?.limit || 50;
      const logs = await get2FAAuditLog(ctx.userId, limit);

      return {
        logs,
        count: logs.length,
      };
    }),

  /**
   * Admin: Get 2FA statistics for all users
   */
  getStatistics: publicProcedure.query(async ({ ctx }) => {
    // Only admins can view statistics
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view 2FA statistics',
      });
    }

    const totalUsers = await prisma.user_profiles.count();

    const usersWithOFA = await prisma.user_profiles.count({
      where: { two_factor_enabled: true },
    });

    const recentSetups = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM public.two_factor_audit_log
      WHERE action = 'setup'
        AND timestamp > NOW() - INTERVAL '30 days'
    `;

    const recentFailures = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM public.two_factor_audit_log
      WHERE action = 'verify'
        AND success = false
        AND timestamp > NOW() - INTERVAL '7 days'
    `;

    return {
      totalUsers,
      usersWithOFA,
      adoptionRate: totalUsers > 0 ? (usersWithOFA / totalUsers) * 100 : 0,
      recentSetups: Number(recentSetups[0]?.count || 0),
      recentFailures: Number(recentFailures[0]?.count || 0),
    };
  }),
});
