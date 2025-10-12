/**
 * GDPR Compliance tRPC Router
 * Data export and right-to-be-forgotten endpoints
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  exportUserData,
  deleteUserData,
  getUserDataSummary,
  formatAsJSON,
  formatAsCSV,
  logGDPRAction,
} from '@/lib/gdpr';

export const gdprRouter = router({
  /**
   * Get summary of user data (for deletion preview)
   */
  getDataSummary: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view data summary',
      });
    }

    const summary = await getUserDataSummary(ctx.userId);

    return {
      summary,
      userId: ctx.userId,
    };
  }),

  /**
   * Export user data in JSON or CSV format
   */
  exportData: publicProcedure
    .input(
      z.object({
        format: z.enum(['json', 'csv']).default('json'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to export data',
        });
      }

      // Log export action
      await logGDPRAction(ctx.userId, 'export', `Format: ${input.format}`);

      // Export data
      const data = await exportUserData(ctx.userId);

      // Format based on requested type
      let formattedData: string;
      let filename: string;
      let mimeType: string;

      if (input.format === 'json') {
        formattedData = formatAsJSON(data);
        filename = `user_data_${ctx.userId}_${Date.now()}.json`;
        mimeType = 'application/json';
      } else {
        formattedData = formatAsCSV(data);
        filename = `user_data_${ctx.userId}_${Date.now()}.csv`;
        mimeType = 'text/csv';
      }

      return {
        success: true,
        data: formattedData,
        filename,
        mimeType,
        exportDate: new Date().toISOString(),
      };
    }),

  /**
   * Request account deletion (step 1: preview)
   */
  requestDeletion: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to request deletion',
      });
    }

    // Get data summary for preview
    const summary = await getUserDataSummary(ctx.userId);

    // Log deletion request
    await logGDPRAction(
      ctx.userId,
      'delete_request',
      `Records to be deleted: Studios: ${summary.studios}, Dancers: ${summary.dancers}, Entries: ${summary.entries}`
    );

    return {
      success: true,
      message: 'Deletion request created',
      summary,
      confirmation_required: true,
    };
  }),

  /**
   * Confirm and execute account deletion (step 2: execute)
   */
  confirmDeletion: publicProcedure
    .input(
      z.object({
        confirmation: z.literal('DELETE_MY_ACCOUNT'),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to confirm deletion',
        });
      }

      // Verify user is deleting their own account
      if (ctx.userId !== input.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own account',
        });
      }

      // Log confirmed deletion
      await logGDPRAction(ctx.userId, 'delete_confirmed', 'User confirmed account deletion');

      // Execute deletion
      const result = await deleteUserData(ctx.userId);

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to delete user data',
        });
      }

      return {
        success: true,
        message: 'Account and all associated data have been permanently deleted',
        deleted_records: result.deleted_records,
      };
    }),

  /**
   * Admin: Get GDPR action logs
   */
  getAuditLog: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid().optional(),
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      // Only admins can view GDPR audit logs
      if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can view GDPR audit logs',
        });
      }

      let logs: any[] = [];

      try {
        if (input.userId) {
          // Get logs for specific user
          logs = await prisma.$queryRaw`
            SELECT user_id, action, details, timestamp
            FROM public.activity_logs
            WHERE user_id = ${input.userId}::uuid
              AND action LIKE 'gdpr_%'
            ORDER BY timestamp DESC
            LIMIT ${input.limit}
          `;
        } else {
          // Get all GDPR logs
          logs = await prisma.$queryRaw`
            SELECT user_id, action, details, timestamp
            FROM public.activity_logs
            WHERE action LIKE 'gdpr_%'
            ORDER BY timestamp DESC
            LIMIT ${input.limit}
          `;
        }
      } catch (error) {
        console.warn('GDPR audit log query failed');
        return { logs: [], count: 0 };
      }

      return {
        logs,
        count: logs.length,
      };
    }),

  /**
   * Admin: Get GDPR statistics
   */
  getStatistics: publicProcedure.query(async ({ ctx }) => {
    // Only admins can view statistics
    if (ctx.userRole !== 'competition_director' && ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can view GDPR statistics',
      });
    }

    let stats = {
      total_exports: 0,
      total_deletion_requests: 0,
      total_deletions_confirmed: 0,
      recent_exports: 0, // Last 30 days
      recent_deletions: 0, // Last 30 days
    };

    try {
      const exportStats = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM public.activity_logs
        WHERE action = 'gdpr_export'
      `;

      const deletionRequestStats = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM public.activity_logs
        WHERE action = 'gdpr_delete_request'
      `;

      const deletionConfirmedStats = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM public.activity_logs
        WHERE action = 'gdpr_delete_confirmed'
      `;

      const recentExportStats = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM public.activity_logs
        WHERE action = 'gdpr_export'
          AND timestamp > NOW() - INTERVAL '30 days'
      `;

      const recentDeletionStats = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM public.activity_logs
        WHERE action = 'gdpr_delete_confirmed'
          AND timestamp > NOW() - INTERVAL '30 days'
      `;

      stats = {
        total_exports: Number(exportStats[0]?.count || 0),
        total_deletion_requests: Number(deletionRequestStats[0]?.count || 0),
        total_deletions_confirmed: Number(deletionConfirmedStats[0]?.count || 0),
        recent_exports: Number(recentExportStats[0]?.count || 0),
        recent_deletions: Number(recentDeletionStats[0]?.count || 0),
      };
    } catch (error) {
      console.warn('GDPR statistics query failed');
    }

    return stats;
  }),

  /**
   * Admin: Force delete user account (emergency use only)
   */
  adminDeleteUser: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only super admins can force delete
      if (ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only super admins can force delete accounts',
        });
      }

      // Log admin deletion
      await logGDPRAction(
        input.userId,
        'delete_confirmed',
        `Admin deletion by ${ctx.userId}. Reason: ${input.reason}`
      );

      // Execute deletion
      const result = await deleteUserData(input.userId);

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'Failed to delete user data',
        });
      }

      return {
        success: true,
        message: 'User account forcibly deleted by admin',
        deleted_records: result.deleted_records,
        admin_id: ctx.userId,
      };
    }),
});

// Import prisma for raw queries
import { prisma } from '@/lib/prisma';
