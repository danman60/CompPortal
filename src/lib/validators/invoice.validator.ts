/**
 * Invoice Validation Schemas
 *
 * Server-side validation for invoice mutations.
 * Ensures financial data integrity.
 *
 * Created: Wave 2.2 (Server-Side Validation)
 */

import { z } from 'zod';

// Invoice line item schema
const invoiceLineItemSchema = z.object({
  routineTitle: z.string().min(1, 'Routine title required'),
  dancers: z.string().min(1, 'Dancers required'),
  category: z.string().min(1, 'Category required'),
  entryFee: z.number().min(0, 'Entry fee cannot be negative').max(10000, 'Entry fee exceeds maximum'),
  lateFee: z.number().min(0, 'Late fee cannot be negative').max(1000, 'Late fee exceeds maximum'),
  subtotal: z.number().min(0, 'Subtotal cannot be negative'),
});

// Invoice generate validation
export const invoiceGenerateSchema = z.object({
  studioId: z.string().uuid({ message: 'Invalid studio ID' }),
  competitionId: z.string().uuid({ message: 'Invalid competition ID' }),
  reservationId: z.string().uuid({ message: 'Invalid reservation ID' }),
});

// Invoice status update validation
export const invoiceStatusSchema = z.object({
  invoiceId: z.string().uuid({ message: 'Invalid invoice ID' }),
  status: z.enum(['DRAFT', 'SENT', 'PAID'], {
    errorMap: () => ({ message: 'Invalid invoice status' }),
  }),
});

// Invoice line items update validation
export const invoiceLineItemsSchema = z.object({
  invoiceId: z.string().uuid({ message: 'Invalid invoice ID' }),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item required'),
});

// Type exports
export type InvoiceGenerateInput = z.infer<typeof invoiceGenerateSchema>;
export type InvoiceStatusInput = z.infer<typeof invoiceStatusSchema>;
export type InvoiceLineItemsInput = z.infer<typeof invoiceLineItemsSchema>;
