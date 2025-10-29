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
 *
 * Ensures the number of participants in an entry falls within the min/max
 * range defined by the entry size category (e.g., Solo: 1, Duo: 2, Group: 3-10).
 *
 * @param entrySizeCategoryId - ID of the entry size category to validate against
 * @param participantCount - Number of dancers in the entry
 * @throws {Error} If size category not found or participant count out of range
 * @example
 * // Validate a group entry with 5 dancers
 * await validateEntrySizeCategory('size-cat-group-id', 5);
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
 *
 * Performs basic validation on reservation requests to ensure they fall within
 * reasonable bounds. Full token-based capacity validation happens in the router.
 *
 * @param competitionId - ID of the competition being reserved for
 * @param studioId - ID of the studio making the reservation (for future use)
 * @param requestedSpaces - Number of entry spaces being requested
 * @throws {Error} If competition not found, spaces < 1, or spaces > 500
 * @example
 * // Validate a reservation request for 25 entries
 * await validateReservationCapacity('comp-id', 'studio-id', 25);
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
 *
 * Checks that adding new entries to a reservation won't exceed the confirmed
 * space allocation. Also ensures the reservation is approved before use.
 *
 * @param reservationId - ID of the reservation to validate
 * @param additionalEntries - Number of new entries being added (default: 1)
 * @throws {Error} If reservation not found, not approved, or capacity exceeded
 * @example
 * // Check if we can add 3 more entries to a reservation
 * await validateReservationSpaces('reservation-id', 3);
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

  const currentEntries = (reservation as any)._count.competition_entries;
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
 *
 * Ensures the provided fee matches the expected calculation based on the size
 * category's base fee, per-participant fee, and any late fees. Allows 1 cent
 * variance for floating-point rounding.
 *
 * @param entrySizeCategoryId - ID of the entry size category
 * @param participantCount - Number of dancers in the entry
 * @param providedFee - Total fee amount being charged
 * @param lateFee - Additional late registration fee (default: 0)
 * @throws {Error} If size category not found or fee calculation mismatch
 * @example
 * // Validate a $75 fee for a duo (base $50 + $12.50 per dancer × 2)
 * await validateEntryFee('duo-category-id', 2, 75.00);
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
 *
 * Verifies that an invoice total matches the sum of all non-cancelled entry fees
 * for a reservation. Allows 1% variance or 50 cents to account for tax and rounding.
 *
 * @param reservationId - ID of the reservation to calculate invoice for
 * @param providedTotal - Total amount shown on the invoice
 * @throws {Error} If invoice total doesn't match expected entry fee sum
 * @example
 * // Validate an invoice totaling $500 for a reservation
 * await validateInvoiceTotal('reservation-id', 500.00);
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
 *
 * Calculates the dancer's age at the competition date and ensures it falls
 * within the age group's min/max range. Allows entries without birth dates
 * but logs a warning.
 *
 * @param dancerId - ID of the dancer to validate
 * @param ageGroupId - ID of the age group to validate against
 * @param competitionDate - Date of the competition (used for age calculation)
 * @throws {Error} If dancer/age group not found or age out of range
 * @example
 * // Validate a 12-year-old dancer for Teen age group
 * await validateDancerAge('dancer-id', 'teen-age-group-id', new Date('2025-06-15'));
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
 *
 * DEPRECATED: Entries can now be created with 0 dancers. Dancers can be attached later.
 * Summary submission (not entry creation) will validate that routines have dancers.
 *
 * @param participantCount - Number of dancers in the entry
 * @example
 * validateMinimumParticipants(1); // OK
 * validateMinimumParticipants(0); // Also OK - dancers can be attached later
 */
export function validateMinimumParticipants(participantCount: number): void {
  // Allow 0 dancers - validation moved to summary submission
  // if (participantCount < 1) {
  //   throw new Error('At least one dancer is required for an entry');
  // }
}

/**
 * Validate maximum participant limit
 *
 * Prevents excessively large entries that might indicate data entry errors.
 * Default limit is 100, but can be customized for specific scenarios.
 *
 * @param participantCount - Number of dancers in the entry
 * @param limit - Maximum allowed dancers (default: 100)
 * @throws {Error} If participant count exceeds the limit
 * @example
 * validateMaximumParticipants(50); // OK (under default limit)
 * validateMaximumParticipants(101); // Throws error (exceeds 100)
 * validateMaximumParticipants(25, 20); // Throws error (exceeds custom limit)
 */
export function validateMaximumParticipants(participantCount: number, limit: number = 100): void {
  if (participantCount > limit) {
    throw new Error(`Too many participants. Maximum ${limit} dancers allowed.`);
  }
}

/**
 * Validate fee range
 *
 * Ensures monetary amounts fall within acceptable bounds. Helps prevent
 * negative fees or unreasonably high amounts that might indicate errors.
 *
 * @param fee - Fee amount to validate
 * @param min - Minimum allowed amount (default: 0)
 * @param max - Maximum allowed amount (default: 10000)
 * @throws {Error} If fee is below min or above max
 * @example
 * validateFeeRange(50); // OK (between $0-$10,000)
 * validateFeeRange(-5); // Throws error (negative)
 * validateFeeRange(15000); // Throws error (exceeds $10,000)
 * validateFeeRange(50, 10, 100); // OK (custom range)
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
 *
 * Enforces valid state machine transitions for entities with status fields.
 * Prevents invalid status changes like pending -> cancelled -> approved.
 *
 * @param currentStatus - Current status of the entity
 * @param newStatus - Desired new status
 * @param allowedTransitions - Map of current status to array of allowed next statuses
 * @throws {Error} If transition is not allowed
 * @example
 * const transitions = {
 *   pending: ['approved', 'rejected'],
 *   approved: ['completed', 'cancelled'],
 *   rejected: []
 * };
 * validateStatusTransition('pending', 'approved', transitions); // OK
 * validateStatusTransition('pending', 'completed', transitions); // Throws error
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
