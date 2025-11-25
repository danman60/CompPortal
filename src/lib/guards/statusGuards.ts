/**
 * Status Guard Utilities
 *
 * Prevents business logic violations by enforcing status transitions
 * and operation requirements.
 *
 * Created: Wave 1.1 (Status Guards)
 */

type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'summarized' | 'invoiced';
type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'UNPAID';

/**
 * Custom error class for status guard violations
 */
export class StatusGuardError extends Error {
  constructor(
    message: string,
    public currentStatus: string,
    public requiredStatus: string | string[]
  ) {
    super(message);
    this.name = 'StatusGuardError';
  }
}

/**
 * Guard reservation status transitions
 *
 * @example
 * guardReservationStatus(reservation.status, ['pending'], 'approve reservation');
 */
export function guardReservationStatus(
  currentStatus: ReservationStatus,
  allowedStatuses: ReservationStatus[],
  operation: string
): void {
  if (!allowedStatuses.includes(currentStatus)) {
    throw new StatusGuardError(
      `Cannot ${operation}: reservation must be ${allowedStatuses.join(' or ')} (currently ${currentStatus})`,
      currentStatus,
      allowedStatuses
    );
  }
}

/**
 * Guard invoice status transitions
 *
 * @example
 * guardInvoiceStatus(invoice.status, ['DRAFT', 'SENT'], 'edit invoice prices');
 */
export function guardInvoiceStatus(
  currentStatus: InvoiceStatus,
  allowedStatuses: InvoiceStatus[],
  operation: string
): void {
  if (!allowedStatuses.includes(currentStatus)) {
    throw new StatusGuardError(
      `Cannot ${operation}: invoice must be ${allowedStatuses.join(' or ')} (currently ${currentStatus})`,
      currentStatus,
      allowedStatuses
    );
  }
}

/**
 * Guard invoice creation requirements
 *
 * Prevents creating invoices when:
 * - Reservation is not approved
 * - No entries have been submitted
 * - Invoice already exists
 *
 * @example
 * guardInvoiceCreation({
 *   status: reservation.status,
 *   entryCount: (reservation as any)._count.entries,
 *   invoice: reservation.invoice,
 * });
 */
export function guardInvoiceCreation(params: {
  status: string;
  entryCount?: number;
  invoice?: { id: string } | null;
}): void {
  const { status, entryCount, invoice } = params;

  // Rule 1: Reservation must be approved
  if (status !== 'approved') {
    throw new StatusGuardError(
      'Cannot create invoice: reservation must be approved first',
      status,
      'approved'
    );
  }

  // Rule 2: Must have at least one entry
  if (!entryCount || entryCount === 0) {
    throw new Error('Cannot create invoice: no entries submitted yet');
  }

  // Rule 3: Invoice must not already exist
  if (invoice) {
    throw new Error('Invoice already exists for this reservation');
  }
}
