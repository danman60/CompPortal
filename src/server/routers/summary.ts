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

      // Query summaries with related data (studios that HAVE submitted)
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

      // Get reservation IDs that already have summaries
      const reservationIdsWithSummaries = new Set(filteredSummaries.map(s => s.reservation_id));

      // Query approved reservations that DON'T have summaries (studios still editing)
      const reservationsWithoutSummaries = await prisma.reservations.findMany({
        where: {
          tenant_id: ctx.tenantId!,
          status: 'approved', // Only approved reservations (not cancelled, not already summarized)
          ...(input.competitionId ? { competition_id: input.competitionId } : {}),
        },
        include: {
          studios: true,
          competitions: true,
          _count: {
            select: { competition_entries: true },
          },
        },
      });

      // Filter out reservations that already have summaries
      const pendingReservations = reservationsWithoutSummaries.filter(
        r => !reservationIdsWithSummaries.has(r.id)
      );

      // For each summary, get the related entries and invoice to calculate totals
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

          // Look up invoice for this reservation
          const invoice = await prisma.invoices.findFirst({
            where: {
              reservation_id: summary.reservation_id,
              status: { not: 'voided' }, // Exclude voided invoices
            },
            select: {
              id: true,
              subtotal: true,
              total: true,
              balance_remaining: true,
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
            status: summary.reservations?.status || 'unknown', // Include reservation status for UI filtering
            entries: entries,
            has_submitted: true, // Flag to indicate this studio has submitted
            // Invoice data for financial tracking
            invoice_subtotal: invoice ? Number(invoice.subtotal) : null,
            invoice_total: invoice ? Number(invoice.total) : null,
            invoice_balance_remaining: invoice ? Number(invoice.balance_remaining) : null,
            has_invoice: !!invoice,
          };
        })
      );

      // For pending reservations, get entry counts and estimated totals
      const pendingWithDetails = await Promise.all(
        pendingReservations.map(async (reservation) => {
          const entries = await prisma.competition_entries.findMany({
            where: {
              reservation_id: reservation.id,
            },
            select: {
              id: true,
              total_fee: true,
              status: true,
            },
          });

          // Look up any existing invoice (from reopened summaries)
          const invoice = await prisma.invoices.findFirst({
            where: {
              reservation_id: reservation.id,
              status: { not: 'voided' },
            },
            select: {
              id: true,
              subtotal: true,
              total: true,
              balance_remaining: true,
              status: true,
            },
          });

          const draftCount = entries.filter(e => e.status === 'draft').length;
          const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.total_fee || 0), 0);

          return {
            id: null, // No summary ID
            reservation_id: reservation.id,
            studio_id: reservation.studio_id || '',
            studio_name: reservation.studios?.name || '',
            studio_code: reservation.studios?.code || null,
            competition_id: reservation.competition_id || '',
            competition_name: reservation.competitions?.name || '',
            entries_used: 0,
            entries_unused: reservation.spaces_confirmed || reservation.spaces_requested || 0,
            submitted_at: null,
            entry_count: entries.length,
            draft_count: draftCount,
            total_amount: totalAmount, // Estimated based on draft entries
            status: 'editing', // Special status for studios still editing
            entries: entries,
            has_submitted: false, // Flag to indicate this studio hasn't submitted yet
            spaces_approved: reservation.spaces_confirmed || reservation.spaces_requested || 0,
            // Invoice data for financial tracking
            invoice_subtotal: invoice ? Number(invoice.subtotal) : null,
            invoice_total: invoice ? Number(invoice.total) : null,
            invoice_balance_remaining: invoice ? Number(invoice.balance_remaining) : null,
            has_invoice: !!invoice,
          };
        })
      );

      return {
        summaries: [...summariesWithDetails, ...pendingWithDetails],
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

  /**
   * Submit summary on behalf of a studio (CD action)
   * Replicates SD submission logic from entry.ts
   * Phase 1 Spec: Lines 589-651 (summary submission workflow)
   */
  submitOnBehalf: adminProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get reservation with related data
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: true,
          competitions: true,
        },
      });

      if (!reservation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reservation not found',
        });
      }

      // Verify tenant isolation
      if (reservation.tenant_id !== ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot access reservation from another tenant',
        });
      }

      // Verify reservation is in 'approved' status (not already summarized/cancelled)
      if (reservation.status !== 'approved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot submit summary for reservation in '${reservation.status}' status. Only 'approved' reservations can be submitted.`,
        });
      }

      // Get all draft entries for this reservation
      const entries = await prisma.competition_entries.findMany({
        where: {
          reservation_id: input.reservationId,
          status: 'draft',
        },
        select: {
          id: true,
          title: true,
          category_id: true,
          age_group_id: true,
          classification_id: true,
          entry_size_category_id: true,
          entry_fee: true,
          late_fee: true,
          total_fee: true,
          status: true,
          reservation_id: true,
          studio_id: true,
          competition_id: true,
          created_at: true,
          updated_at: true,
        },
      });

      const routineCount = entries.length;

      // Validate that there are entries to submit
      if (routineCount === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No draft entries found for this reservation. The studio needs to create routines first.',
        });
      }

      // Calculate unused spaces
      const originalSpaces = reservation.spaces_confirmed || 0;
      const unusedSpaces = originalSpaces - routineCount;

      // Allow 5-routine tolerance for edge cases
      const OVERAGE_TOLERANCE = 5;
      if (unusedSpaces < -OVERAGE_TOLERANCE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot submit summary: ${routineCount} entries but only ${originalSpaces} approved spaces. The studio needs to withdraw ${Math.abs(unusedSpaces)} routines first.`,
        });
      }

      // Wrap all database operations in a transaction
      await prisma.$transaction(async (tx) => {
        // Idempotency check - prevent duplicate summary submissions
        const existingSummary = await tx.summaries.findUnique({
          where: { reservation_id: input.reservationId },
        });

        if (existingSummary) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Summary has already been submitted for this reservation.',
          });
        }

        // Update reservation status to 'summarized'
        await tx.reservations.update({
          where: { id: input.reservationId },
          data: {
            spaces_confirmed: routineCount,
            status: 'summarized',
            is_closed: true,
            updated_at: new Date(),
          },
        });

        // Refund unused spaces if any
        if (unusedSpaces > 0) {
          const competition = await tx.competitions.findUnique({
            where: { id: reservation.competition_id! },
            select: {
              tenant_id: true,
              available_reservation_tokens: true,
              total_reservation_tokens: true,
            },
          });

          if (competition) {
            const available = competition.available_reservation_tokens || 0;
            const total = competition.total_reservation_tokens || 0;

            if (available + unusedSpaces <= total) {
              await tx.competitions.update({
                where: { id: reservation.competition_id! },
                data: {
                  available_reservation_tokens: {
                    increment: unusedSpaces,
                  },
                },
              });

              // Create audit trail
              await tx.capacity_ledger.create({
                data: {
                  tenant_id: competition.tenant_id,
                  competition_id: reservation.competition_id!,
                  reservation_id: input.reservationId,
                  change_amount: unusedSpaces,
                  reason: 'summary_refund_by_cd',
                  created_by: ctx.userId,
                },
              });
            }
          }
        }

        // Create summary record
        const summary = await tx.summaries.create({
          data: {
            tenant_id: ctx.tenantId!,
            reservation_id: input.reservationId,
            entries_used: routineCount,
            entries_unused: Math.max(0, unusedSpaces),
            submitted_at: new Date(),
          },
        });

        // Create entry snapshots
        const summaryEntriesData = entries.map((entry) => {
          const snapshot = {
            ...entry,
            created_at: entry.created_at?.toISOString(),
            updated_at: entry.updated_at?.toISOString(),
          };

          return {
            tenant_id: ctx.tenantId!,
            summary_id: summary.id,
            entry_id: entry.id,
            snapshot: snapshot as any,
          };
        });

        await tx.summary_entries.createMany({
          data: summaryEntriesData,
        });

        // Update all entry statuses to 'submitted'
        await tx.competition_entries.updateMany({
          where: {
            id: { in: entries.map(e => e.id) },
          },
          data: { status: 'submitted' },
        });
      }, {
        timeout: 10000,
        maxWait: 5000,
      });

      // Log activity (outside transaction)
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'summary.submitted_by_cd',
          entityType: 'summary',
          entityId: input.reservationId,
          details: {
            reservation_id: input.reservationId,
            studio_id: reservation.studio_id,
            studio_name: reservation.studios?.name,
            competition_id: reservation.competition_id,
            entries_count: routineCount,
            entries_unused: Math.max(0, unusedSpaces),
            notes: input.notes,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }

      return {
        success: true,
        message: `Summary submitted for ${reservation.studios?.name}. ${routineCount} entries moved to 'Awaiting Invoice' status.`,
        entries_submitted: routineCount,
        entries_unused: Math.max(0, unusedSpaces),
      };
    }),
});
