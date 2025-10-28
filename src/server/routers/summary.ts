import { z } from 'zod';
import { router, adminProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { TRPCError } from '@trpc/server';

/**
 * Summary Router - Phase 1 Workflow
 * Handles routine summary approvals by Competition Directors
 *
 * Phase 1 Spec Reference: Lines 589-651 (summary approval workflow)
 */

export const summaryRouter = router({
  /**
   * Get all summaries for Competition Director review
   * Returns pending summaries grouped by studio/competition
   * Phase 1 Spec: Lines 398-438 (summary submission creates these records)
   */
  getAll: adminProcedure
    .input(
      z.object({
        competitionId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {

      // Query summaries with related data
      const summaries = await prisma.summaries.findMany({
        where: {
          tenant_id: ctx.tenantId!, // Tenant isolation
        },
        include: {
          reservations: {
            include: {
              studios: true,
              competitions: true,
            },
          },
        },
        orderBy: {
          submitted_at: 'desc',
        },
      });

      // Filter by competition if specified
      const filteredSummaries = input.competitionId
        ? summaries.filter(s => s.reservations?.competition_id === input.competitionId)
        : summaries;

      // For each summary, get the related entries to calculate totals
      const summariesWithDetails = await Promise.all(
        filteredSummaries.map(async (summary) => {
          const entries = await prisma.competition_entries.findMany({
            where: {
              reservation_id: summary.reservation_id,
              status: 'submitted', // Entries in submitted status waiting for approval
            },
            select: {
              id: true,
              total_fee: true,
              status: true,
            },
          });

          const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.total_fee || 0), 0);

          return {
            id: summary.id,
            reservation_id: summary.reservation_id,
            studio_id: summary.reservations?.studio_id || '',
            studio_name: summary.reservations?.studios?.name || '',
            studio_code: summary.reservations?.studios?.code || null,
            competition_id: summary.reservations?.competition_id || '',
            competition_name: summary.reservations?.competitions?.name || '',
            entries_used: summary.entries_used,
            entries_unused: summary.entries_unused,
            submitted_at: summary.submitted_at,
            entry_count: entries.length,
            total_amount: totalAmount,
            entries: entries,
          };
        })
      );

      return {
        summaries: summariesWithDetails,
      };
    }),

  /**
   * Approve or reject a summary
   * On approval: Changes entries from 'submitted' to 'confirmed' status
   * Phase 1 Spec: Lines 589-651 (approval triggers invoice generation)
   */
  approve: adminProcedure
    .input(
      z.object({
        summaryId: z.string().uuid(),
        action: z.enum(['approve', 'reject']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      // Get the summary with reservation details
      const summary = await prisma.summaries.findUnique({
        where: { id: input.summaryId },
        include: {
          reservations: {
            include: {
              studios: true,
              competitions: true,
            },
          },
        },
      });

      if (!summary) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Summary not found',
        });
      }

      // Get all entries for this reservation that are in 'submitted' status
      const entries = await prisma.competition_entries.findMany({
        where: {
          reservation_id: summary.reservation_id,
          status: 'submitted',
        },
      });

      if (entries.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No submitted entries found for this summary',
        });
      }

      if (input.action === 'approve') {
        // Transaction: Change all submitted entries to confirmed status
        await prisma.$transaction(async (tx) => {
          // Update all submitted entries to confirmed
          await tx.competition_entries.updateMany({
            where: {
              reservation_id: summary.reservation_id,
              status: 'submitted',
            },
            data: {
              status: 'confirmed',
            },
          });

          // Log activity
          await logActivity({
            userId: ctx.userId,
            action: 'summary.approved',
            entityType: 'summary',
            entityId: input.summaryId,
            details: {
              reservation_id: summary.reservation_id,
              studio_id: summary.reservations?.studio_id,
              competition_id: summary.reservations?.competition_id,
              entries_count: entries.length,
              notes: input.notes,
            },
          });
        });

        return {
          success: true,
          message: `Summary approved. ${entries.length} entries confirmed.`,
          entries_confirmed: entries.length,
        };
      } else {
        // Rejection: Log activity (entries remain in 'submitted' status)
        await logActivity({
          userId: ctx.userId,
          action: 'summary.rejected',
          entityType: 'summary',
          entityId: input.summaryId,
          details: {
            reservation_id: summary.reservation_id,
            studio_id: summary.reservations?.studio_id,
            competition_id: summary.reservations?.competition_id,
            entries_count: entries.length,
            notes: input.notes,
          },
        });

        return {
          success: true,
          message: 'Summary rejected.',
          entries_confirmed: 0,
        };
      }
    }),
});
