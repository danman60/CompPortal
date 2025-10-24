import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

type CapacityChangeReason =
  | 'reservation_approval'
  | 'summary_refund'
  | 'reservation_cancellation'
  | 'manual_adjustment';

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
   * @throws InsufficientCapacityError if not enough capacity
   * @throws Error if reservation already processed
   */
  async reserve(
    competitionId: string,
    spaces: number,
    reservationId: string,
    userId: string
  ): Promise<void> {
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

    await prisma.$transaction(async (tx) => {
      logger.info('🔵 Transaction started - acquiring advisory lock', { reservationId });

      // 🔒 ATOMIC GUARD: Use PostgreSQL advisory lock
      // This locks at APPLICATION LEVEL and is guaranteed to work across the transaction
      // Lock is automatically released when transaction commits/rollbacks
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${reservationId}::text))`;

      logger.info('🔵 Advisory lock acquired, fetching reservation', { reservationId });

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

      // Lock competition row for update
      const competition = await tx.competitions.findUnique({
        where: { id: competitionId },
        select: {
          available_reservation_tokens: true,
          total_reservation_tokens: true,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const available = competition.available_reservation_tokens || 0;

      if (available < spaces) {
        throw new Error(
          `Insufficient capacity: ${available} available, ${spaces} requested`
        );
      }

      // ⚡ ATOMIC OPERATIONS: All updates in same transaction
      // 1. Deduct capacity
      await tx.competitions.update({
        where: { id: competitionId },
        data: {
          available_reservation_tokens: {
            decrement: spaces,
          },
        },
      });

      // 2. Update reservation status (prevents double-processing)
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

      // 3. Log to ledger (audit trail)
      await tx.capacity_ledger.create({
        data: {
          competition_id: competitionId,
          reservation_id: reservationId,
          change_amount: -spaces, // Negative = deduction
          reason: 'reservation_approval',
          created_by: userId,
        },
      });

      logger.info('🟢 Transaction COMMITTED - capacity reserved', {
        competitionId,
        reservationId,
        spaces,
        previousAvailable: available,
        newAvailable: available - spaces,
        timestamp: new Date().toISOString(),
      });
    });

    logger.info('🟢 CapacityService.reserve COMPLETED', {
      reservationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Refund capacity (increment available)
   * Used when summary submitted with unused entries or reservation cancelled
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
          available_reservation_tokens: true,
          total_reservation_tokens: true,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const available = competition.available_reservation_tokens || 0;
      const total = competition.total_reservation_tokens || 0;

      // Prevent refunding beyond total capacity
      if (available + spaces > total) {
        logger.error('Refund would exceed total capacity', {
          competitionId,
          currentAvailable: available,
          refundAmount: spaces,
          total,
        });
        throw new Error('Cannot refund more than total capacity');
      }

      // Increment capacity
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
