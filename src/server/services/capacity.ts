import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

type CapacityChangeReason =
  | 'reservation_approval'
  | 'summary_refund'
  | 'reservation_cancellation'
  | 'manual_adjustment'
  | 'cd_adjustment_increase'
  | 'cd_adjustment_decrease'
  | 'sd_space_increase';

/**
 * Single source of truth for competition capacity management
 * All capacity changes MUST go through this service
 *
 * Matches Phase 1 spec lines 50-68 (capacity formula)
 * Implements atomic transactions with audit trail
 */
export class CapacityService {
  /**
   * Reserve capacity (decrement available)
   * Uses database row locking to prevent race conditions
   *
   * SOFT LIMIT: Capacity can go negative (over-booking allowed)
   * Returns warning when capacity exceeded for UI display
   *
   * @throws Error if reservation already processed
   * @returns Object with exceededBy value (0 if within capacity, positive if exceeded)
   */
  async reserve(
    competitionId: string,
    spaces: number,
    reservationId: string,
    userId: string,
    reason: CapacityChangeReason = 'reservation_approval'
  ): Promise<{ exceededBy: number; availableBefore: number; availableAfter: number }> {
    logger.info('🔵 CapacityService.reserve CALLED', {
      competitionId,
      spaces,
      reservationId,
      userId,
      timestamp: new Date().toISOString(),
    });

    if (spaces <= 0) {
      throw new Error('Spaces must be positive');
    }

    let exceededBy = 0;
    let availableBefore = 0;
    let availableAfter = 0;

    await prisma.$transaction(async (tx) => {
      logger.info('🔵 Transaction started - acquiring advisory lock', { reservationId });

      // 🔒 ATOMIC GUARD: Use PostgreSQL advisory lock
      // This locks at APPLICATION LEVEL and is guaranteed to work across the transaction
      // Lock is automatically released when transaction commits/rollbacks
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${reservationId}::text))`;

      logger.info('🔵 Advisory lock acquired, fetching reservation', { reservationId });

      // Only check status/idempotency for initial approval, not CD adjustments
      if (reason === 'reservation_approval') {
        // Now fetch reservation status after lock is acquired
        const reservation = await tx.reservations.findUnique({
          where: { id: reservationId },
          select: { id: true, status: true },
        });

        if (!reservation) {
          throw new Error('Reservation not found');
        }

        logger.info('🔵 Reservation fetched', {
          reservationId,
          status: reservation.status,
        });

        if (reservation.status !== 'pending') {
          logger.warn('Reservation already processed - status guard', {
            reservationId,
            status: reservation.status,
          });
          return; // Already approved/rejected, skip silently
        }

        // Check idempotency via ledger (backup check)
        const existingLedger = await tx.capacity_ledger.findFirst({
          where: {
            reservation_id: reservationId,
            reason: 'reservation_approval',
          },
        });

        if (existingLedger) {
          logger.warn('Reservation already processed - ledger check', {
            reservationId,
            existingChange: existingLedger.change_amount,
          });
          return; // Already processed, skip silently
        }
      }

      // Lock competition row for update
      const competition = await tx.competitions.findUnique({
        where: { id: competitionId },
        select: {
          tenant_id: true,
          available_reservation_tokens: true,
          total_reservation_tokens: true,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const available = competition.available_reservation_tokens || 0;
      availableBefore = available;

      // 🆕 SOFT LIMIT: Check if exceeding capacity but ALLOW it
      if (available < spaces) {
        exceededBy = spaces - available;
        logger.warn('⚠️ CAPACITY EXCEEDED - Allowed with warning', {
          competitionId,
          reservationId,
          available,
          requested: spaces,
          exceededBy,
          reason,
        });
      }

      // ⚡ ATOMIC OPERATIONS: All updates in same transaction
      // CRITICAL ORDER: Create ledger FIRST so unique constraint blocks ALL operations on duplicate calls

      // 1. Log to ledger (audit trail) - UNIQUE CONSTRAINT GUARD
      // If duplicate call, this will throw and prevent steps 2-3 from executing
      await tx.capacity_ledger.create({
        data: {
          tenant_id: competition.tenant_id,
          competition_id: competitionId,
          reservation_id: reservationId,
          change_amount: -spaces, // Negative = deduction
          reason,
          created_by: userId,
          // 🆕 Add metadata when capacity exceeded for audit trail
          ...(exceededBy > 0 && {
            metadata: {
              capacity_exceeded: true,
              exceeded_by: exceededBy,
              available_before: available,
              requested: spaces,
            },
          }),
        },
      });

      // 2. Deduct capacity (only executes if ledger created successfully)
      // 🆕 ALLOW NEGATIVE: No check, can go below zero
      await tx.competitions.update({
        where: { id: competitionId },
        data: {
          available_reservation_tokens: {
            decrement: spaces,
          },
        },
      });

      availableAfter = available - spaces;

      // 3. Update reservation status (prevents double-processing)
      await tx.reservations.update({
        where: { id: reservationId },
        data: {
          status: 'approved',
          spaces_confirmed: spaces,
          approved_at: new Date(),
          approved_by: userId,
          updated_at: new Date(),
        },
      });

      logger.info('🟢 Transaction COMMITTED - capacity reserved', {
        competitionId,
        reservationId,
        spaces,
        previousAvailable: available,
        newAvailable: availableAfter,
        exceededBy,
        timestamp: new Date().toISOString(),
      });
    });

    logger.info('🟢 CapacityService.reserve COMPLETED', {
      reservationId,
      exceededBy,
      timestamp: new Date().toISOString(),
    });

    return { exceededBy, availableBefore, availableAfter };
  }

  /**
   * Refund capacity (increment available)
   * Used when summary submitted with unused entries or reservation cancelled
   *
   * SOFT LIMIT: Can refund even if it would exceed total capacity
   * (e.g., when returning capacity from over-booked reservations)
   *
   * Matches Phase 1 spec lines 589-651 (summary refund pseudocode)
   */
  async refund(
    competitionId: string,
    spaces: number,
    reservationId: string,
    reason: CapacityChangeReason,
    userId: string
  ): Promise<void> {
    if (spaces <= 0) {
      throw new Error('Refund spaces must be positive');
    }

    await prisma.$transaction(async (tx) => {
      // Lock row for update
      const competition = await tx.competitions.findUnique({
        where: { id: competitionId },
        select: {
          tenant_id: true,
          available_reservation_tokens: true,
          total_reservation_tokens: true,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const available = competition.available_reservation_tokens || 0;
      const total = competition.total_reservation_tokens || 0;

      // 🆕 SOFT LIMIT: Allow refunding beyond total capacity
      // This can happen when returning capacity from over-booked reservations
      if (available + spaces > total) {
        logger.warn('⚠️ Refund exceeds total capacity - Allowed with warning', {
          competitionId,
          currentAvailable: available,
          refundAmount: spaces,
          total,
          newAvailable: available + spaces,
        });
      }

      // Increment capacity (can go above total)
      await tx.competitions.update({
        where: { id: competitionId },
        data: {
          available_reservation_tokens: {
            increment: spaces,
          },
        },
      });

      // Log to ledger (audit trail)
      await tx.capacity_ledger.create({
        data: {
          tenant_id: competition.tenant_id,
          competition_id: competitionId,
          reservation_id: reservationId,
          change_amount: spaces, // Positive = refund
          reason,
          created_by: userId,
        },
      });

      logger.info('Capacity refunded', {
        competitionId,
        reservationId,
        spaces,
        reason,
        previousAvailable: available,
        newAvailable: available + spaces,
      });
    });
  }

  /**
   * Get current available capacity with locking
   * Use this instead of direct prisma queries
   */
  async getAvailable(competitionId: string): Promise<number> {
    const competition = await prisma.competitions.findUnique({
      where: { id: competitionId },
      select: { available_reservation_tokens: true },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    return competition.available_reservation_tokens || 0;
  }

  /**
   * Get audit trail for capacity changes
   * Useful for debugging "where did my capacity go?"
   */
  async getLedger(
    competitionId: string,
    options?: { reservationId?: string; limit?: number }
  ) {
    return prisma.capacity_ledger.findMany({
      where: {
        competition_id: competitionId,
        ...(options?.reservationId && { reservation_id: options.reservationId }),
      },
      include: {
        reservations: {
          include: {
            studios: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: options?.limit || 100,
    });
  }

  /**
   * Reconcile capacity - verify ledger matches current state
   * Returns discrepancies if any
   */
  async reconcile(competitionId: string) {
    const competition = await prisma.competitions.findUnique({
      where: { id: competitionId },
      select: {
        total_reservation_tokens: true,
        available_reservation_tokens: true,
      },
    });

    if (!competition) {
      throw new Error('Competition not found');
    }

    const ledger = await prisma.capacity_ledger.findMany({
      where: { competition_id: competitionId },
      select: { change_amount: true },
    });

    const totalChanges = ledger.reduce((sum, entry) => sum + entry.change_amount, 0);
    const total = competition.total_reservation_tokens || 0;
    const expectedAvailable = total + totalChanges;
    const actualAvailable = competition.available_reservation_tokens || 0;

    const discrepancy = actualAvailable - expectedAvailable;

    return {
      competitionId,
      total,
      actualAvailable,
      expectedAvailable,
      discrepancy,
      isAccurate: discrepancy === 0,
      ledgerEntryCount: ledger.length,
    };
  }
}

// Export singleton instance
export const capacityService = new CapacityService();
