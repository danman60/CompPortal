/**
 * Entry Validation Schemas
 *
 * Server-side validation for entry mutations using Zod.
 * Prevents invalid data from reaching the database.
 *
 * Created: Wave 2.2 (Server-Side Validation)
 */

import { z } from 'zod';

// Base entry validation
export const entryCreateSchema = z.object({
  competitionId: z.string().uuid({ message: 'Invalid competition ID' }),
  studioId: z.string().uuid({ message: 'Invalid studio ID' }),
  reservationId: z.string().uuid({ message: 'Invalid reservation ID' }),
  routineTitle: z.string().min(1, 'Routine title is required').max(200, 'Title too long'),
  danceCategory: z.string().min(1, 'Dance category is required'),
  ageGroup: z.string().min(1, 'Age group is required'),
  danceStyle: z.string().min(1, 'Dance style is required'),
  musicTitle: z.string().optional(),
  musicArtist: z.string().optional(),
  duration: z.number().int().min(60, 'Duration must be at least 60 seconds').max(600, 'Duration cannot exceed 10 minutes'),
  propsRequired: z.boolean().default(false),
  specialNotes: z.string().max(1000, 'Notes too long').optional(),
  entryFee: z.number().min(0, 'Entry fee cannot be negative').max(10000, 'Entry fee exceeds maximum'),
  totalFee: z.number().min(0, 'Total fee cannot be negative').max(10000, 'Total fee exceeds maximum'),
  dancers: z.array(
    z.object({
      dancerId: z.string().uuid({ message: 'Invalid dancer ID' })
    })
  ).min(0, 'Invalid dancers array').max(100, 'Too many dancers'),
});

// Entry update validation
export const entryUpdateSchema = z.object({
  id: z.string().uuid({ message: 'Invalid entry ID' }),
  routineTitle: z.string().min(1, 'Routine title is required').max(200, 'Title too long').optional(),
  danceCategory: z.string().min(1, 'Dance category is required').optional(),
  ageGroup: z.string().min(1, 'Age group is required').optional(),
  danceStyle: z.string().min(1, 'Dance style is required').optional(),
  musicTitle: z.string().optional(),
  musicArtist: z.string().optional(),
  duration: z.number().int().min(60, 'Duration must be at least 60 seconds').max(600, 'Duration cannot exceed 10 minutes').optional(),
  propsRequired: z.boolean().optional(),
  specialNotes: z.string().max(1000, 'Notes too long').optional(),
});

// Entry delete validation
export const entryDeleteSchema = z.object({
  id: z.string().uuid({ message: 'Invalid entry ID' }),
});

// Bulk operations
export const entryBulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one entry ID required').max(100, 'Too many entries'),
});

// Type exports
export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
export type EntryUpdateInput = z.infer<typeof entryUpdateSchema>;
export type EntryDeleteInput = z.infer<typeof entryDeleteSchema>;
export type EntryBulkDeleteInput = z.infer<typeof entryBulkDeleteSchema>;
