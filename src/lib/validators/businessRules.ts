/**
 * Business Rule Validators
 *
 * Domain-specific validation rules that enforce business logic.
 * These run AFTER basic Zod type validation passes.
 *
 * Wave 2.2: Server-Side Validation (Business Rules)
 */

import { prisma } from '../prisma';

/**
 * Validate entry participant count matches size category constraints
 */
export async function validateEntrySizeCategory(
  entrySizeCategoryId: string,
  participantCount: number
): Promise<void> {
  const sizeCategory = await prisma.entry_size_categories.findUnique({
    where: { id: entrySizeCategoryId },
    select: { name: true, min_participants: true, max_participants: true },
  });

  if (!sizeCategory) {
    throw new Error('Entry size category not found');
  }

  const min = sizeCategory.min_participants || 1;
  const max = sizeCategory.max_participants || 999;

  if (participantCount < min || participantCount > max) {
    throw new Error(
      `Invalid participant count for ${sizeCategory.name}. Must be between ${min} and ${max}. Got ${participantCount}.`
    );
  }
}

/**
 * Validate reservation capacity against competition limits
 * Note: Token-based capacity is validated separately in reservation router
 * This function validates basic constraints only
 */
export async function validateReservationCapacity(
  competitionId: string,
  studioId: string,
  requestedSpaces: number
): Promise<void> {
  // Check if competition exists
  const competition = await prisma.competitions.findUnique({
    where: { id: competitionId },
    select: { id: true, venue_capacity: true },
  });

  if (!competition) {
    throw new Error('Competition not found');
  }

  // Validate requested spaces is positive
  if (requestedSpaces < 1) {
    throw new Error('Requested spaces must be at least 1');
  }

  // Validate reasonable upper limit (prevent accidental large requests)
  if (requestedSpaces > 500) {
    throw new Error('Requested spaces exceeds reasonable limit (500 max)');
  }
}

/**
 * Validate reservation doesn't exceed allocated spaces
 */
export async function validateReservationSpaces(
  reservationId: string,
  additionalEntries: number = 1
): Promise<void> {
  const reservation = await prisma.reservations.findUnique({
    where: { id: reservationId },
    include: {
      _count: { select: { competition_entries: true } },
    },
  });

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  if (reservation.status !== 'approved') {
    throw new Error('Reservation must be approved before creating entries');
  }

  const currentEntries = reservation._count.competition_entries;
  const confirmedSpaces = reservation.spaces_confirmed || 0;
  const totalEntries = currentEntries + additionalEntries;

  if (totalEntries > confirmedSpaces) {
    throw new Error(
      `Reservation capacity exceeded. Confirmed: ${confirmedSpaces}, Current: ${currentEntries}, Attempting: ${additionalEntries}`
    );
  }
}

/**
 * Validate entry fee calculation
 */
export async function validateEntryFee(
  entrySizeCategoryId: string,
  participantCount: number,
  providedFee: number,
  lateFee: number = 0
): Promise<void> {
  const sizeCategory = await prisma.entry_size_categories.findUnique({
    where: { id: entrySizeCategoryId },
    select: { base_fee: true, per_participant_fee: true },
  });

  if (!sizeCategory) {
    throw new Error('Entry size category not found');
  }

  const baseFee = Number(sizeCategory.base_fee || 0);
  const perParticipantFee = Number(sizeCategory.per_participant_fee || 0);
  const expectedFee = baseFee + (perParticipantFee * participantCount);
  const expectedTotal = expectedFee + lateFee;

  // Allow 1 cent variance for rounding
  const variance = Math.abs(providedFee - expectedTotal);
  if (variance > 0.01) {
    throw new Error(
      `Invalid entry fee. Expected $${expectedTotal.toFixed(2)} (base: $${baseFee}, per-dancer: $${perParticipantFee} × ${participantCount}, late: $${lateFee}). Got $${providedFee.toFixed(2)}.`
    );
  }
}

/**
 * Validate invoice amounts match entry totals
 */
export async function validateInvoiceTotal(
  reservationId: string,
  providedTotal: number
): Promise<void> {
  const entries = await prisma.competition_entries.findMany({
    where: { reservation_id: reservationId, status: { not: 'cancelled' } },
    select: { total_fee: true },
  });

  const expectedTotal = entries.reduce((sum, entry) => sum + Number(entry.total_fee || 0), 0);

  // Allow 1% variance for tax/rounding
  const variance = Math.abs(providedTotal - expectedTotal);
  const allowedVariance = expectedTotal * 0.01;

  if (variance > allowedVariance && variance > 0.50) {
    throw new Error(
      `Invoice total mismatch. Expected $${expectedTotal.toFixed(2)} from entries. Got $${providedTotal.toFixed(2)}.`
    );
  }
}

/**
 * Validate dancer age matches age group
 */
export async function validateDancerAge(
  dancerId: string,
  ageGroupId: string,
  competitionDate: Date
): Promise<void> {
  const [dancer, ageGroup] = await Promise.all([
    prisma.dancers.findUnique({
      where: { id: dancerId },
      select: { date_of_birth: true, first_name: true, last_name: true },
    }),
    prisma.age_groups.findUnique({
      where: { id: ageGroupId },
      select: { name: true, min_age: true, max_age: true },
    }),
  ]);

  if (!dancer) {
    throw new Error('Dancer not found');
  }

  if (!ageGroup) {
    throw new Error('Age group not found');
  }

  if (!dancer.date_of_birth) {
    // Age not set - allow but warn
    console.warn(`Dancer ${dancer.first_name} ${dancer.last_name} has no birth date set`);
    return;
  }

  // Calculate age at competition date
  const birthDate = new Date(dancer.date_of_birth);
  const ageAtCompetition = competitionDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = competitionDate.getMonth() - birthDate.getMonth();
  const dayDiff = competitionDate.getDate() - birthDate.getDate();
  const age = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? ageAtCompetition - 1 : ageAtCompetition;

  const minAge = ageGroup.min_age || 0;
  const maxAge = ageGroup.max_age || 999;

  if (age < minAge || age > maxAge) {
    throw new Error(
      `Dancer ${dancer.first_name} ${dancer.last_name} (age ${age}) does not fit ${ageGroup.name} (${minAge}-${maxAge} years).`
    );
  }
}

/**
 * Validate minimum participant requirement
 */
export function validateMinimumParticipants(participantCount: number): void {
  if (participantCount < 1) {
    throw new Error('At least one dancer is required for an entry');
  }
}

/**
 * Validate maximum participant limit
 */
export function validateMaximumParticipants(participantCount: number, limit: number = 100): void {
  if (participantCount > limit) {
    throw new Error(`Too many participants. Maximum ${limit} dancers allowed.`);
  }
}

/**
 * Validate fee range
 */
export function validateFeeRange(fee: number, min: number = 0, max: number = 10000): void {
  if (fee < min) {
    throw new Error(`Fee cannot be less than $${min.toFixed(2)}`);
  }
  if (fee > max) {
    throw new Error(`Fee cannot exceed $${max.toFixed(2)}`);
  }
}

/**
 * Validate status transition
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  allowedTransitions: Record<string, string[]>
): void {
  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ')}`
    );
  }
}
