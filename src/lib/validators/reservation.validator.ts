/**
 * Reservation Validation Schemas
 *
 * Server-side validation for reservation mutations.
 * Enforces capacity limits and business rules.
 *
 * Created: Wave 2.2 (Server-Side Validation)
 */

import { z } from 'zod';

// Reservation create validation
export const reservationCreateSchema = z.object({
  competitionId: z.string().uuid({ message: 'Invalid competition ID' }),
  studioId: z.string().uuid({ message: 'Invalid studio ID' }),
  spacesAllocated: z.number().int().min(1, 'Must request at least 1 routine').max(600, 'Cannot exceed 600 routines'),
  notes: z.string().max(2000, 'Notes too long').optional(),
});

// Reservation approval validation
export const reservationApprovalSchema = z.object({
  id: z.string().uuid({ message: 'Invalid reservation ID' }),
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Status must be approved or rejected' }),
  }),
  notes: z.string().max(2000, 'Notes too long').optional(),
});

// Reservation update validation
export const reservationUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Invalid reservation ID' }),
  spacesAllocated: z.number().int().min(1, 'Must request at least 1 routine').max(600, 'Cannot exceed 600 routines').optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
});

// Type exports
export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
export type ReservationApprovalInput = z.infer<typeof reservationApprovalSchema>;
export type ReservationUpdateInput = z.infer<typeof reservationUpdateSchema>;
