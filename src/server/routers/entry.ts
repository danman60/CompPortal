import { z } from 'zod';
import { TRPCError } from '@trpc/server';
// Force rebuild - Deploy Bug #3 fix (commit 9818afe with transaction wrapper)
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { getTenantPortalUrl } from '@/lib/tenant-url';
import {
  renderEntrySubmitted,
  renderRoutineSummarySubmitted,
  getEmailSubject,
  type EntrySubmittedData,
  type RoutineSummarySubmittedData,
} from '@/lib/email-templates';
import { logActivity } from '@/lib/activity';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase-server';
import { isAdmin, isSuperAdmin } from '@/lib/auth-utils';
import { capacityService } from '../services/capacity';
import {
  validateEntrySizeCategory,
  validateMinimumParticipants,
  validateMaximumParticipants,
  validateFeeRange
} from '@/lib/validators/businessRules';

/**
 * Helper function to check if email notification is enabled for a user
 */
async function isEmailEnabled(userId: string, emailType: string): Promise<boolean> {
  try {
    const preference = await prisma.email_preferences.findUnique({
      where: {
        user_id_email_type: {
          user_id: userId,
          email_type: emailType as any,
        },
      },
    });
    // Default to true if no preference exists
    return preference?.enabled ?? true;
  } catch (error) {
    logger.error('Failed to check email preference', { error: error instanceof Error ? error : new Error(String(error)), userId, emailType });
    // Default to true on error
    return true;
  }
}

/**
 * Helper function to get user email from Supabase auth
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) {
      logger.error('Failed to fetch user email from auth', { error, userId });
      return null;
    }
    return data.user?.email || null;
  } catch (error) {
    logger.error('Failed to fetch user email from auth', { error: error instanceof Error ? error : new Error(String(error)), userId });
    return null;
  }
}

// Validation schema for entry participant
const entryParticipantSchema = z.object({
  dancer_id: z.string().uuid(),
  dancer_name: z.string().max(255),
  dancer_age: z.number().int().min(0).optional(),
  role: z.string().max(100).optional(),
  display_order: z.number().int().min(0).optional(),
  costume_size: z.string().max(20).optional(),
  special_needs: z.string().optional(),
});

// Validation schema for entry input
const entryInputSchema = z.object({
  competition_id: z.string().uuid(),
  reservation_id: z.string().uuid().optional(),
  studio_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  category_id: z.string().uuid(),
  classification_id: z.string().uuid(),
  age_group_id: z.string().uuid().optional(), // Optional - auto-detected from dancers
  entry_size_category_id: z.string().uuid().optional(), // Optional - auto-detected from dancers
  session_id: z.string().uuid().optional(),
  performance_date: z.string().optional(), // ISO date string
  performance_time: z.string().optional(), // ISO time string
  duration: z.string().optional(), // Duration in format "HH:MM:SS"
  warm_up_time: z.string().optional(), // ISO time string
  heat: z.string().max(50).optional(),
  running_order: z.number().int().min(0).optional(),
  is_title_upgrade: z.boolean().default(false),
  is_title_interview: z.boolean().default(false),
  is_improvisation: z.boolean().default(false),
  is_glow_off_round: z.boolean().default(false),
  is_overall_competition: z.boolean().default(false),
  music_title: z.string().max(255).optional(),
  music_artist: z.string().max(255).optional(),
  music_file_url: z.string().url().optional().or(z.literal('')),
  special_requirements: z.string().optional(),
  entry_fee: z.number().min(0).optional(),
  late_fee: z.number().min(0).default(0),
  total_fee: z.number().min(0).optional(),
  status: z.enum(['draft', 'submitted', 'registered', 'confirmed', 'cancelled', 'completed', 'pending_classification_approval', 'withdrawn']).default('draft'),
  choreographer: z.string().min(1).max(255), // Phase 2 spec lines 36-42: Required
  costume_description: z.string().optional(),
  props_required: z.string().optional(),
  accessibility_needs: z.string().optional(),
  // Phase 2 spec lines 324-373: Extended time fields
  extended_time_requested: z.boolean().default(false),
  routine_length_minutes: z.number().int().min(0).max(15).optional(),
  routine_length_seconds: z.number().int().min(0).max(59).optional(),
  scheduling_notes: z.string().optional(),
  routine_age: z.number().int().min(5).max(99).optional(), // Final selected age for routine
  participants: z.array(entryParticipantSchema).optional(),
});

export const entryRouter = router({
  // Get routine summary for a studio & competition
  getSummary: protectedProcedure
    .input(z.object({ studioId: z.string().uuid(), competitionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { studioId, competitionId } = input;

      // First find the approved reservation (matches submitSummary logic at line 151)
      const reservation = await prisma.reservations.findFirst({
        where: { studio_id: studioId, competition_id: competitionId, status: 'approved' },
        select: { id: true, spaces_confirmed: true },
      });

      if (!reservation) {
        return {
          totalRoutines: 0,
          estimatedCost: 0,
          remainingTokens: 0,
          status: 'no_reservation',
        };
      }

      // Only count entries for THIS reservation (matches submitSummary at line 171)
      const entries = await prisma.competition_entries.findMany({
        where: { reservation_id: reservation.id, status: { notIn: ['cancelled', 'withdrawn'] } },
        select: { total_fee: true },
      });

      const totalRoutines = entries.length;
      const estimatedCost = entries.reduce((sum: number, e: any) => sum + Number(e.total_fee || 0), 0);
      const confirmed = reservation.spaces_confirmed || 0;

      return {
        totalRoutines,
        estimatedCost,
        remainingTokens: Math.max(confirmed - totalRoutines, 0),
        status: 'draft',
      };
    }),

  // Submit routine summary (lock & request invoice)
  submitSummary: protectedProcedure
    .input(z.object({ studioId: z.string().uuid(), competitionId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { studioId, competitionId } = input;

      // Fetch studio and competition data
      // First find the reservation to filter entries by reservation_id (per PHASE1_SPEC.md line 602)
      // Note: Don't filter by status='approved' here - let idempotency check handle already-submitted summaries
      const reservation = await prisma.reservations.findFirst({
        where: {
          tenant_id: ctx.tenantId!,
          studio_id: studioId,
          competition_id: competitionId,
        },
        select: { id: true },
      });

      const [studio, competition, entries] = await Promise.all([
        prisma.studios.findUnique({
          where: { id: studioId },
          select: { name: true, email: true, tenant_id: true },
        }),
        prisma.competitions.findUnique({
          where: { id: competitionId },
          select: { name: true, year: true, tenant_id: true },
        }),
        prisma.competition_entries.findMany({
          where: {
            tenant_id: ctx.tenantId!,
            reservation_id: reservation?.id,
            status: { notIn: ['cancelled', 'withdrawn'] },
          },
          // Fetch full entry data for snapshot (entry.ts:351)
          select: {
            id: true,
            title: true,
            entry_number: true,
            routine_number: true,
            category_id: true,
            classification_id: true,
            age_group_id: true,
            entry_size_category_id: true,
            music_title: true,
            music_artist: true,
            choreographer: true,
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
        }),
      ]);

      if (!studio || !competition) {
        throw new Error('Studio or competition not found');
      }

      // Verify tenant isolation
      if (studio.tenant_id !== ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot access studio from another tenant',
        });
      }

      if (competition.tenant_id !== ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot access competition from another tenant',
        });
      }

      const routineCount = entries.length;
      const totalFees = entries.reduce((sum: number, e: any) => sum + Number(e.total_fee || 0), 0);

      // 🐛 FIX Bug #3: Validate that there are entries to submit
      if (routineCount === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You\'ll need to create at least one routine before submitting your summary. Head to "Create Routine" to get started!',
        });
      }

      // 🐛 FIX Bug #23: Update reservation to reflect actual submitted routines
      // Fetch full reservation details if it exists
      const fullReservation = reservation
        ? await prisma.reservations.findUnique({
            where: { id: reservation.id },
          })
        : null;

      if (!fullReservation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No reservation found for this studio and competition. Please contact the Competition Director if you believe this is an error.',
        });
      }

      // Verify tenant isolation (defense in depth)
      if (fullReservation.tenant_id !== ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot access reservation from another tenant',
        });
      }

      // Calculate unused spaces before transaction for activity logging
      const originalSpaces = fullReservation.spaces_confirmed || 0;
      const unusedSpaces = originalSpaces - routineCount;

      // 🐛 FIX: Validate capacity before attempting database insert (graceful error)
      if (unusedSpaces < 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot submit summary: You have ${routineCount} active routines but only ${originalSpaces} approved spaces. Please withdraw ${Math.abs(unusedSpaces)} routines or request additional spaces from the Competition Director.`,
        });
      }

      // Wrap all database operations in a transaction for atomicity
      logger.info('🔄 Transaction START - summary submission', {
        reservationId: fullReservation.id,
        studioId,
        competitionId,
        routineCount,
        unusedSpaces,
        timestamp: Date.now(),
      });

      await prisma.$transaction(async (tx) => {
        // Idempotency check - prevent duplicate summary submissions (PHASE1_SPEC.md line 599)
        const existingSummary = await tx.summaries.findUnique({
          where: { reservation_id: fullReservation.id },
        });

        if (existingSummary) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Your summary has already been submitted. The Competition Director will prepare your invoice within 72 hours. Well done!',
          });
        }

        // Update reservation status to 'summarized' (PHASE1_SPEC.md line 629)
        await tx.reservations.update({
          where: { id: fullReservation.id },
          data: {
            spaces_confirmed: routineCount, // Lock to actual submitted count
            status: 'summarized', // Mark as summarized per spec
            is_closed: true, // Always close after summary submission
            updated_at: new Date(),
          },
        });

        // Refund unused spaces inline (avoid nested transaction)
        // Matches Phase 1 spec lines 589-651 (capacity refund on summary submission)
        if (unusedSpaces > 0) {
          // Lock competition row and get current capacity
          const competition = await tx.competitions.findUnique({
            where: { id: competitionId },
            select: {
              tenant_id: true,
              available_reservation_tokens: true,
              total_reservation_tokens: true,
            },
          });

          if (!competition) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Competition not found',
            });
          }

          const available = competition.available_reservation_tokens || 0;
          const total = competition.total_reservation_tokens || 0;

          // Validate refund won't exceed total capacity
          if (available + unusedSpaces > total) {
            logger.error('Refund would exceed total capacity', {
              competitionId,
              currentAvailable: available,
              refundAmount: unusedSpaces,
              total,
            });
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Cannot refund more than total capacity',
            });
          }

          // Increment capacity (refund unused spaces)
          await tx.competitions.update({
            where: { id: competitionId },
            data: {
              available_reservation_tokens: {
                increment: unusedSpaces,
              },
            },
          });

          // Create audit trail in capacity ledger
          await tx.capacity_ledger.create({
            data: {
              tenant_id: competition.tenant_id,
              competition_id: competitionId,
              reservation_id: fullReservation.id,
              change_amount: unusedSpaces, // Positive = refund
              reason: 'summary_refund',
              created_by: ctx.userId,
            },
          });

          logger.info('Capacity refunded during summary submission', {
            competitionId,
            reservationId: fullReservation.id,
            spaces: unusedSpaces,
            previousAvailable: available,
            newAvailable: available + unusedSpaces,
          });
        }

        // Create summary record (PHASE1_SPEC.md lines 611-616)
        const summary = await tx.summaries.create({
          data: {
            tenant_id: ctx.tenantId!,
            reservation_id: fullReservation.id,
            entries_used: routineCount,
            entries_unused: unusedSpaces,
            submitted_at: new Date(),
          },
        });

        // Create entry snapshots and update entry statuses (PHASE1_SPEC.md lines 619-626)
        // Use batch operations to prevent transaction timeout with large entry counts
        const summaryEntriesData = entries.map((entry) => {
          // Create immutable snapshot for audit trail
          // Convert dates to ISO strings for clean JSON serialization
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

        // Batch create all summary entries (1 operation instead of N)
        await tx.summary_entries.createMany({
          data: summaryEntriesData,
        });

        // Batch update all entry statuses to 'submitted' (1 operation instead of N)
        await tx.competition_entries.updateMany({
          where: {
            id: { in: entries.map(e => e.id) },
          },
          data: { status: 'submitted' },
        });

        logger.info('✅ Transaction END - about to commit', {
          reservationId: fullReservation.id,
          summaryId: summary.id,
          entriesProcessed: entries.length,
          timestamp: Date.now(),
        });

        // Activity logging moved outside transaction to prevent rollback issues
      }, {
        timeout: 10000, // 10 second timeout
        maxWait: 5000,  // 5 second max wait for connection
      });

      logger.info('💾 Transaction COMMITTED successfully', {
        reservationId: fullReservation.id,
        timestamp: Date.now(),
      });

      // POST-TRANSACTION VERIFICATION - Catch "success response but no database change" paradox
      const verification = await prisma.reservations.findUnique({
        where: { id: fullReservation.id },
        select: {
          status: true,
          is_closed: true,
          spaces_confirmed: true,
          updated_at: true,
        },
      });

      logger.info('🔍 POST-TRANSACTION VERIFICATION', {
        reservationId: fullReservation.id,
        actual: verification,
        expected: { status: 'summarized', is_closed: true, spaces_confirmed: routineCount },
      });

      // This should NEVER happen if transaction succeeded
      if (!verification?.is_closed || verification?.status !== 'summarized') {
        logger.error('🚨 TRANSACTION PARADOX DETECTED', {
          reservationId: fullReservation.id,
          status: verification?.status,
          is_closed: verification?.is_closed,
          expected: { status: 'summarized', is_closed: true },
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `TRANSACTION PARADOX: Returned success but reservation not updated. Status: ${verification?.status}, Closed: ${verification?.is_closed}`,
        });
      }

      // Log activity for summary submission (non-blocking, outside transaction)
      try {
        await logActivity({
          userId: ctx.userId,
          action: 'summary.submitted',
          entityType: 'summary',
          entityId: fullReservation.id, // Use reservation ID since summary ID not available here
          details: {
            reservation_id: fullReservation.id,
            studio_id: studioId,
            competition_id: competitionId,
            entries_count: routineCount,
            entries_unused: unusedSpaces,
          },
        });
      } catch (logError) {
        logger.error('Failed to log summary submission activity', {
          error: logError instanceof Error ? logError : new Error(String(logError))
        });
        // Don't throw - activity logging should never block main operations
      }

      // Send "routine_summary_submitted" email to Competition Directors (non-blocking)
      try {
        // Get all Competition Directors for this tenant
        const competitionDirectors = await prisma.user_profiles.findMany({
          where: {
            tenant_id: studio.tenant_id,
            role: 'competition_director',
          },
          select: {
            id: true,
            first_name: true,
          },
        });

        // Fetch tenant branding for emails
        const tenant = await prisma.tenants.findUnique({
          where: { id: studio.tenant_id },
          select: { branding: true },
        });
        const branding = tenant?.branding as { primaryColor?: string; secondaryColor?: string } | null;

        // Send email to each CD who has this preference enabled
        for (const cd of competitionDirectors) {
          const isEnabled = await isEmailEnabled(cd.id, 'routine_summary_submitted');
          if (!isEnabled) continue;

          const cdEmail = await getUserEmail(cd.id);
          if (!cdEmail) continue;

          const emailData: RoutineSummarySubmittedData = {
            studioName: studio.name,
            competitionName: competition.name,
            competitionYear: competition.year,
            routineCount,
            totalFees,
            studioEmail: studio.email || '',
            portalUrl: await getTenantPortalUrl(studio.tenant_id, '/dashboard/routine-summaries'),
            tenantBranding: branding || undefined,
          };

          const html = await renderRoutineSummarySubmitted(emailData);
          const subject = getEmailSubject('routine-summary-submitted', {
            studioName: studio.name,
            competitionName: competition.name,
          });

          await sendEmail({
            to: cdEmail,
            subject,
            html,
            templateType: 'routine-summary-submitted',
            studioId: studioId,
            competitionId: competitionId,
          });
        }
      } catch (error) {
        logger.error('Failed to send routine summary submitted email to CDs', {
          error: error instanceof Error ? error : new Error(String(error)),
          studioId,
          competitionId,
        });
        // Don't throw - email failure shouldn't block summary submission
      }

      return { success: true };
    }),

  // Download routine summary PDF - placeholder link
  downloadSummaryPDF: protectedProcedure
    .input(z.object({ studioId: z.string().uuid(), competitionId: z.string().uuid() }))
    .mutation(async () => {
      return { url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/entries` };
    }),

  // Bulk import routines from CSV-like input
  bulkImport: protectedProcedure
    .input(z.object({
      competition_id: z.string().uuid(),
      studio_id: z.string().uuid(),
      routines: z.array(z.object({
        routine_title: z.string().min(1),
        choreographer: z.string().optional(),
        dance_category: z.string().min(1),
        classification: z.string().min(1),
        props: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { competition_id, studio_id, routines } = input;

      const defaultAge = await prisma.age_groups.findFirst({ orderBy: { sort_order: 'asc' } });
      if (!defaultAge) throw new Error('No age groups configured');
      const defaultSize = await prisma.entry_size_categories.findFirst({ orderBy: { sort_order: 'asc' }, select: { id: true } });
      if (!defaultSize) throw new Error('No size categories configured');

      const results = await Promise.allSettled(routines.map(async (row) => {
        const category = await prisma.dance_categories.findFirst({ where: { name: { equals: row.dance_category, mode: 'insensitive' } }, select: { id: true } });
        const classification = await prisma.classifications.findFirst({ where: { name: { equals: row.classification, mode: 'insensitive' } }, select: { id: true } });
        if (!category || !classification) {
          throw new Error(`Lookup failed for category '${row.dance_category}' or classification '${row.classification}'`);
        }
        return prisma.competition_entries.create({
          data: {
            tenant_id: ctx.tenantId!,
            competition_id,
            studio_id,
            title: row.routine_title,
            category_id: category.id,
            classification_id: classification.id,
            age_group_id: defaultAge.id,
            entry_size_category_id: defaultSize.id,
            status: 'draft',
            choreographer: row.choreographer || undefined,
            special_requirements: row.props || undefined,
            entry_fee: new (require('@prisma/client').Prisma.Decimal)(0),
            total_fee: new (require('@prisma/client').Prisma.Decimal)(0),
          },
        });
      }));

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - successful;
      const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r: any) => r.reason?.message || 'Unknown error');

      return { successful, failed, total: results.length, errors };
    }),
  // Get all entries with optional filtering (role-based access)
  getAll: protectedProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
          competitionId: z.string().uuid().optional(),
          reservationId: z.string().uuid().optional(),
          status: z.string().optional(),
          tenantId: z.string().uuid().optional(), // Super admin can filter by specific tenant
          limit: z.number().int().min(1).max(1000).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .nullish()
    )
    .query(async ({ input, ctx }) => {
      const { studioId, competitionId, reservationId, status, tenantId, limit = 50, offset = 0 } = input ?? {};

      const where: any = {};

      // Role-based filtering: studio directors can only see their own entries
      if (ctx.userRole === 'studio_director') {
        if (!ctx.studioId) {
          return { entries: [], total: 0, limit, offset, hasMore: false };
        }
        where.studio_id = ctx.studioId;
      } else if (studioId) {
        // Admins can filter by specific studio
        where.studio_id = studioId;
      }

      // Tenant filtering: super admins can see all tenants or filter by specific tenant
      // Entries don't have direct tenant_id, so filter via studio relationship
      if (!isSuperAdmin(ctx.userRole)) {
        // Non-super admins: filter entries to their tenant via studios
        if (!where.studio_id) {
          // If not already filtered by specific studio, add tenant filter
          if (!ctx.tenantId) {
            return { entries: [], total: 0, limit, offset, hasMore: false };
          }
          where.studios = {
            tenant_id: ctx.tenantId,
          };
        }
      } else if (tenantId) {
        // Super admin filtering by specific tenant
        where.studios = {
          tenant_id: tenantId,
        };
      }

      if (competitionId) {
        where.competition_id = competitionId;
      }

      if (reservationId) {
        where.reservation_id = reservationId;
      }

      if (status) {
        where.status = status;
      } else {
        // Hide withdrawn entries from SD view (soft delete)
        where.status = { notIn: ['withdrawn'] };
      }

      const [entries, total] = await Promise.all([
        prisma.competition_entries.findMany({
          where,
          select: {
            id: true,
            title: true,
            status: true,
            entry_number: true,
            entry_suffix: true,
            is_late_entry: true,
            competition_id: true,
            reservation_id: true,
            studio_id: true,
            music_file_url: true,
            music_title: true,
            music_artist: true,
            created_at: true,
            total_fee: true,
            routine_age: true,
            is_title_upgrade: true,
            extended_time_requested: true,
            routine_length_minutes: true,
            routine_length_seconds: true,
            studios: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            competitions: {
              select: {
                id: true,
                name: true,
                year: true,
              },
            },
            age_groups: {
              select: {
                id: true,
                name: true,
              },
            },
            dance_categories: {
              select: {
                id: true,
                name: true,
              },
            },
            classifications: {
              select: {
                id: true,
                name: true,
                skill_level: true,
              },
            },
            entry_size_categories: {
              select: {
                id: true,
                name: true,
              },
            },
            entry_participants: {
              select: {
                id: true,
                dancer_id: true,
                dancer_name: true,
                dancer_age: true,
                role: true,
              },
              orderBy: { display_order: 'asc' },
            },
            classification_exception_requests: {
              select: {
                id: true,
                status: true,
                cd_decision_type: true,
              },
            },
          },
          orderBy: [
            { entry_number: 'asc' },
            { title: 'asc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.competition_entries.count({ where }),
      ]);

      return {
        entries,
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
      };
    }),

  // Get entry counts only (optimized for dashboard - no full record fetching)
  getCounts: protectedProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
          competitionId: z.string().uuid().optional(),
          reservationId: z.string().uuid().optional(),
          tenantId: z.string().uuid().optional(),
        })
        .nullish()
    )
    .query(async ({ input, ctx }) => {
      const { studioId, competitionId, reservationId, tenantId } = input ?? {};

      const where: any = {};

      // Role-based filtering: studio directors can only see their own entries
      if (ctx.userRole === 'studio_director') {
        if (!ctx.studioId) {
          return { total: 0, byReservation: {}, byStatus: {}, byCompetition: {} };
        }
        where.studio_id = ctx.studioId;
      } else if (studioId) {
        where.studio_id = studioId;
      }

      // Tenant filtering
      if (!isSuperAdmin(ctx.userRole)) {
        if (!where.studio_id) {
          if (!ctx.tenantId) {
            return { total: 0, byReservation: {}, byStatus: {}, byCompetition: {} };
          }
          where.studios = {
            tenant_id: ctx.tenantId,
          };
        }
      } else if (tenantId) {
        where.studios = {
          tenant_id: tenantId,
        };
      }

      if (competitionId) {
        where.competition_id = competitionId;
      }

      if (reservationId) {
        where.reservation_id = reservationId;
      }

      // Get total count
      const total = await prisma.competition_entries.count({ where });

      // Get counts grouped by reservation_id
      const byReservationRaw = await prisma.competition_entries.groupBy({
        by: ['reservation_id'],
        where,
        _count: true,
      });

      const byReservation: Record<string, number> = {};
      byReservationRaw.forEach((item) => {
        if (item.reservation_id) {
          byReservation[item.reservation_id] = item._count;
        }
      });

      // Get counts grouped by status
      const byStatusRaw = await prisma.competition_entries.groupBy({
        by: ['status'],
        where,
        _count: true,
      });

      const byStatus: Record<string, number> = {};
      byStatusRaw.forEach((item) => {
        if (item.status) {
          byStatus[item.status] = item._count;
        }
      });

      // Get counts grouped by competition_id
      const byCompetitionRaw = await prisma.competition_entries.groupBy({
        by: ['competition_id'],
        where,
        _count: true,
      });

      const byCompetition: Record<string, number> = {};
      byCompetitionRaw.forEach((item) => {
        byCompetition[item.competition_id] = item._count;
      });

      return {
        total,
        byReservation,
        byStatus,
        byCompetition,
      };
    }),

  // Get a single entry by ID (role-based access)
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.id },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              province: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
            },
          },
          entry_participants: {
            include: {
              dancers: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  date_of_birth: true,
                  email: true,
                  phone: true,
                  classification_id: true,
                },
              },
            },
            orderBy: { display_order: 'asc' },
          },
          age_groups: true,
          dance_categories: true,
          classifications: true,
          entry_size_categories: true,
          competition_sessions: true,
          classification_exception_requests: {
            select: {
              id: true,
              status: true,
              cd_decision_type: true,
            },
            where: {
              status: 'pending', // Only fetch pending requests
            },
          },
        },
      });

      if (!entry) {
        throw new Error('Entry not found');
      }

      // Studio directors can only access their own studio's entries
      if (ctx.userRole === 'studio_director' && entry.studio_id !== ctx.studioId) {
        throw new Error('Unauthorized access to this entry');
      }

      return entry;
    }),

  // Get entries by studio
  getByStudio: publicProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ input }) => {
      const entries = await prisma.competition_entries.findMany({
        where: {
          studio_id: input.studioId,
          status: { not: 'withdrawn' }, // Hide withdrawn entries from studio view
        },
        include: {
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
          entry_participants: {
            select: {
              id: true,
              dancer_name: true,
            },
          },
          _count: {
            select: {
              entry_participants: true,
            },
          },
        },
        orderBy: [
          { entry_number: 'asc' },
        ],
      });

      return {
        entries,
        count: entries.length,
      };
    }),

  // Get entry statistics
  getStats: publicProcedure
    .input(
      z
        .object({
          competitionId: z.string().uuid().optional(),
          studioId: z.string().uuid().optional(),
        })
        .nullish()
    )
    .query(async ({ input }) => {
      const where: any = {};

      if (input?.competitionId) {
        where.competition_id = input.competitionId;
      }

      if (input?.studioId) {
        where.studio_id = input.studioId;
      }

      const [total, byStatus, totalFees] = await Promise.all([
        prisma.competition_entries.count({ where }),
        prisma.competition_entries.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.competition_entries.aggregate({
          where,
          _sum: {
            entry_fee: true,
            late_fee: true,
            total_fee: true,
          },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status || 'unknown'] = item._count;
          return acc;
        }, {} as Record<string, number>),
        totalEntryFees: totalFees._sum.entry_fee || 0,
        totalLateFees: totalFees._sum.late_fee || 0,
        totalFees: totalFees._sum.total_fee || 0,
      };
    }),

  // Create a new entry with participants
  create: protectedProcedure
    .input(entryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        performance_date,
        performance_time,
        warm_up_time,
        entry_fee,
        late_fee,
        total_fee,
        participants,
        ...data
      } = input;

      // 🐛 FIX Bug #22: Validate reservation capacity (count only non-cancelled entries)
      if (input.reservation_id) {
        const reservation = await prisma.reservations.findUnique({
          where: { id: input.reservation_id },
        });

        if (!reservation) {
          throw new Error('Reservation not found.');
        }

        if (reservation.status !== 'approved') {
          throw new Error('Reservation must be approved before creating routines.');
        }

        if (reservation.studio_id !== input.studio_id || reservation.competition_id !== input.competition_id) {
          throw new Error('Invalid reservation for this studio and competition.');
        }

        // Count only non-withdrawn entries for this reservation
        const currentEntries = await prisma.competition_entries.count({
          where: {
            reservation_id: input.reservation_id,
            status: { not: 'withdrawn' },
          },
        });

        const confirmedSpaces = reservation.spaces_confirmed || 0;

        if (currentEntries >= confirmedSpaces) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Reservation capacity exceeded. You have ${confirmedSpaces} confirmed spaces and ${currentEntries} active routines. Please request additional spaces from the Competition Director.`,
          });
        }
      }

      // Verify user has tenant context (protectedProcedure ensures ctx.tenantId exists)
      if (!ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tenant associated with user'
        });
      }

      // Verify studio exists and belongs to user's tenant
      const studio = await prisma.studios.findUnique({
        where: {
          id: data.studio_id,
          tenant_id: ctx.tenantId // Verify tenant isolation
        },
        select: { id: true, name: true },
      });

      if (!studio) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'We couldn\'t find your studio profile. Please contact support if this persists.'
        });
      }

      // Get defaults for age_group and entry_size_category if not provided (required by schema)
      let ageGroupId = data.age_group_id;
      let entrySizeCategoryId = data.entry_size_category_id;

      if (!ageGroupId) {
        const defaultAge = await prisma.age_groups.findFirst({
          where: { tenant_id: ctx.tenantId },
          orderBy: { sort_order: 'asc' }
        });
        if (!defaultAge) throw new Error('No age groups configured for your organization');
        ageGroupId = defaultAge.id;
      }

      if (!entrySizeCategoryId) {
        const defaultSize = await prisma.entry_size_categories.findFirst({
          where: { tenant_id: ctx.tenantId },
          orderBy: { sort_order: 'asc' },
          select: { id: true }
        });
        if (!defaultSize) throw new Error('No size categories configured for your organization');
        entrySizeCategoryId = defaultSize.id;
      }

      // 🔐 TENANT ISOLATION CHECKS (prevent cross-tenant fee calculation)
      // Verify entry_size_category belongs to correct tenant BEFORE fee calculation
      if (entrySizeCategoryId) {
        const sizeCategoryCheck = await prisma.entry_size_categories.findUnique({
          where: {
            id: entrySizeCategoryId,
            tenant_id: ctx.tenantId,
          },
          select: { id: true },
        });
        if (!sizeCategoryCheck) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'That entry size isn\'t available for this competition. Please choose from the available options.',
          });
        }
      }

      // 🔐 BUSINESS RULE VALIDATIONS (Wave 2.2)
      const participantCount = participants?.length || 0;

      // Validate minimum participants
      validateMinimumParticipants(participantCount);

      // Validate participant count matches size category constraints
      // NOTE: Validator lacks tenant context, but we verified ID above
      if (entrySizeCategoryId && participantCount > 0) {
        await validateEntrySizeCategory(entrySizeCategoryId, participantCount);
      }

      // Validate maximum participants limit
      validateMaximumParticipants(participantCount);

      // Create entry with participants using two-step pattern
      // See docs/PRISMA_BEST_PRACTICES.md - nested creates cause NULL FK violations
      // Step 1: Build entry data WITHOUT nested creates (use scalar FKs)
      const createData: any = {
        title: data.title,
        status: data.status,
        is_title_upgrade: data.is_title_upgrade,
        is_title_interview: data.is_title_interview,
        is_improvisation: data.is_improvisation,
        is_glow_off_round: data.is_glow_off_round,
        is_overall_competition: data.is_overall_competition,
        // Use scalar FK fields (not relational syntax) to avoid mixing with nested creates
        tenant_id: ctx.tenantId,
        competition_id: data.competition_id,
        studio_id: data.studio_id,
        category_id: data.category_id,
        classification_id: data.classification_id,
        age_group_id: ageGroupId,
        entry_size_category_id: entrySizeCategoryId,
      };

      // Optional FK fields (use scalar syntax for consistency)
      // Auto-link to approved reservation if not provided
      if (data.reservation_id) {
        createData.reservation_id = data.reservation_id;
      } else {
        const approvedReservation = await prisma.reservations.findFirst({
          where: {
            studio_id: data.studio_id,
            competition_id: data.competition_id,
            status: 'approved',
          },
          select: { id: true },
        });
        if (approvedReservation) {
          createData.reservation_id = approvedReservation.id;
        }
      }
      if (data.session_id) createData.session_id = data.session_id;

      // Required string fields (Phase 2 spec lines 36-42)
      createData.choreographer = data.choreographer;

      // Optional string fields
      if (data.props_required) createData.props_required = data.props_required;
      if (data.special_requirements) createData.special_requirements = data.special_requirements;
      if (data.costume_description) createData.costume_description = data.costume_description;
      if (data.accessibility_needs) createData.accessibility_needs = data.accessibility_needs;
      if (data.music_title) createData.music_title = data.music_title;
      if (data.music_artist) createData.music_artist = data.music_artist;
      if (data.music_file_url) createData.music_file_url = data.music_file_url;
      if (data.heat) createData.heat = data.heat;
      if (data.running_order !== undefined) createData.running_order = data.running_order;
      if (data.duration) createData.duration = data.duration;

      // Phase 2 spec lines 324-373: Extended time fields
      if (data.extended_time_requested) createData.extended_time_requested = data.extended_time_requested;
      if (data.routine_length_minutes !== undefined) createData.routine_length_minutes = data.routine_length_minutes;
      if (data.routine_length_seconds !== undefined) createData.routine_length_seconds = data.routine_length_seconds;
      if (data.scheduling_notes) createData.scheduling_notes = data.scheduling_notes;

      // Routine age (locks in on entry creation, finalized on summary submission)
      if (data.routine_age !== undefined) createData.routine_age = data.routine_age;

      // Date/time fields
      if (performance_date) createData.performance_date = new Date(performance_date);
      if (performance_time) createData.performance_time = new Date(`1970-01-01T${performance_time}`);
      if (warm_up_time) createData.warm_up_time = new Date(`1970-01-01T${warm_up_time}`);

      // Fee fields - calculate from size category if not provided
      let finalEntryFee = entry_fee;
      let finalTotalFee = total_fee;

      if (finalEntryFee === undefined || finalEntryFee === 0) {
        // Auto-calculate from entry_size_category pricing
        const sizeCategory = await prisma.entry_size_categories.findUnique({
          where: { id: entrySizeCategoryId },
          select: { base_fee: true, per_participant_fee: true },
        });

        if (sizeCategory) {
          const baseFee = Number(sizeCategory.base_fee || 0);
          const perParticipantFee = Number(sizeCategory.per_participant_fee || 0);
          const participantCount = participants?.length || 0;
          finalEntryFee = baseFee + (perParticipantFee * participantCount);

          // Add title upgrade fee if applicable
          if (data.is_title_upgrade) {
            finalEntryFee += 30;
          }

          // Add extended time fee if applicable (not for submitted entries)
          if (data.extended_time_requested && data.status !== 'submitted') {
            const extendedTimeFee = participantCount === 1 ? 5 : participantCount * 2;
            finalEntryFee += extendedTimeFee;
          }

          finalTotalFee = finalEntryFee + (late_fee || 0);
        }
      }

      // Validate fee ranges
      if (finalEntryFee !== undefined) {
        validateFeeRange(finalEntryFee, 0, 10000);
      }
      if (finalTotalFee !== undefined) {
        validateFeeRange(finalTotalFee, 0, 10000);
      }

      if (finalEntryFee !== undefined) createData.entry_fee = finalEntryFee.toString();
      if (late_fee !== undefined) createData.late_fee = late_fee.toString();
      if (finalTotalFee !== undefined) createData.total_fee = finalTotalFee.toString();

      // Two-step creation pattern to avoid nested create bug
      // Step 1: Create entry WITHOUT participants
      const entry = await prisma.$transaction(async (tx) => {
        const createdEntry = await tx.competition_entries.create({
          data: createData,
        });

        // Step 2: Create participants separately if provided
        if (participants && participants.length > 0) {
          await tx.entry_participants.createMany({
            data: participants.map((p) => ({
              // Required fields
              entry_id: createdEntry.id, // Link to parent entry
              dancer_id: p.dancer_id,
              tenant_id: ctx.tenantId!, // CRITICAL: Multi-tenant isolation
              dancer_name: p.dancer_name,
              dancer_age: p.dancer_age,
              // Optional fields (only include if defined)
              ...(p.role && { role: p.role }),
              ...(p.display_order !== undefined && { display_order: p.display_order }),
              ...(p.costume_size && { costume_size: p.costume_size }),
              ...(p.special_needs && { special_needs: p.special_needs }),
            })),
          });
        }

        // Return entry with participants included
        const entryWithRelations = await tx.competition_entries.findUnique({
          where: { id: createdEntry.id },
          include: {
            entry_participants: {
              include: {
                dancers: true,
              },
            },
            studios: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!entryWithRelations) {
          throw new Error('Failed to retrieve created entry');
        }

        return entryWithRelations;
      });

      // Activity logging (non-blocking, only if user is authenticated)
      if (ctx.userId) {
        try {
          await logActivity({
            userId: ctx.userId,
            tenantId: ctx.tenantId ?? undefined,
            studioId: input.studio_id,
            action: 'entry.create',
            entityType: 'entry',
            entityId: entry.id,
            entityName: entry.title,
            details: {
              title: entry.title,
              competition_id: entry.competition_id,
              studio_id: entry.studio_id,
              category_id: entry.category_id,
              classification_id: entry.classification_id,
            },
          });
        } catch (err) {
          logger.error('Failed to log activity (entry.create)', { error: err instanceof Error ? err : new Error(String(err)) });
        }
      }

      // DISABLED: Send entry_submitted email notification (per user request - too noisy)
      // Studios get confirmation when they submit the entire summary, not per-entry
      // try {
      //   // Fetch additional data for email
      //   const [studio, competition, category, sizeCategory] = await Promise.all([
      //     prisma.studios.findUnique({
      //       where: { id: input.studio_id },
      //       select: { name: true, email: true, owner_id: true },
      //     }),
      //     prisma.competitions.findUnique({
      //       where: { id: input.competition_id },
      //       select: { name: true, year: true },
      //     }),
      //     prisma.dance_categories.findUnique({
      //       where: { id: input.category_id },
      //       select: { name: true },
      //     }),
      //     // Size category is optional now (auto-detected from dancers)
      //     input.entry_size_category_id ? prisma.entry_size_categories.findUnique({
      //       where: { id: input.entry_size_category_id },
      //       select: { name: true },
      //     }) : Promise.resolve(null),
      //   ]);
      //
      //   if (studio?.email && studio.owner_id && competition && category) {
      //     // Check if entry_submitted email preference is enabled
      //     const isEnabled = await isEmailEnabled(studio.owner_id, 'entry_submitted');
      //
      //     if (isEnabled) {
      //       const emailData: EntrySubmittedData = {
      //         studioName: studio.name,
      //         competitionName: competition.name,
      //         competitionYear: competition.year,
      //         entryTitle: entry.title,
      //         entryNumber: entry.entry_number || undefined,
      //         category: category.name,
      //         sizeCategory: sizeCategory?.name || 'TBD', // TBD if not set (auto-detected later)
      //         participantCount: entry.entry_participants?.length || 0,
      //         entryFee: entry_fee || 0,
      //       };
      //
      //       const html = await renderEntrySubmitted(emailData);
      //       const subject = getEmailSubject('entry', {
      //         entryTitle: entry.title,
      //         competitionName: competition.name,
      //       });
      //
      //       await sendEmail({
      //         to: studio.email,
      //         subject,
      //         html,
      //         templateType: 'entry-submitted',
      //         studioId: input.studio_id,
      //         competitionId: input.competition_id,
      //       });
      //     }
      //   }
      // } catch (emailError) {
      //   logger.error('Failed to send entry submission email', { error: emailError instanceof Error ? emailError : new Error(String(emailError)) });
      //   // Don't fail the mutation if email fails
      // }

      return entry;
    }),

  // Update an entry
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: entryInputSchema.partial().omit({ participants: true }),
      })
    )
    .mutation(async ({ input }) => {
      const {
        performance_date,
        performance_time,
        warm_up_time,
        entry_fee,
        late_fee,
        total_fee,
        ...data
      } = input.data;

      // 🐛 FIX Bug #18: Explicitly extract and preserve status field
      // The schema default 'draft' was preventing status updates to 'registered'
      const { status, ...otherData } = data;

      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          ...otherData,
          ...(status && { status }), // Explicitly include status if provided
          performance_date: performance_date ? new Date(performance_date) : undefined,
          performance_time: performance_time ? new Date(`1970-01-01T${performance_time}`) : undefined,
          warm_up_time: warm_up_time ? new Date(`1970-01-01T${warm_up_time}`) : undefined,
          entry_fee: entry_fee?.toString(),
          late_fee: late_fee?.toString(),
          total_fee: total_fee?.toString(),
          updated_at: new Date(),
        },
        include: {
          entry_participants: {
            include: {
              dancers: true,
            },
          },
        },
      });

      return entry;
    }),

  // Add participant to entry
  addParticipant: protectedProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        participant: entryParticipantSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get entry with studio_id for ownership check
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.entryId },
        select: {
          tenant_id: true,
          studio_id: true,
          status: true,
          reservations: {
            select: { is_closed: true }
          }
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'We couldn\'t find that routine. It may have been deleted or moved.',
        });
      }

      // SECURITY: Verify SD owns this entry
      if (ctx.userRole === 'studio_director') {
        if (entry.studio_id !== ctx.studioId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only modify your own studio\'s routines',
          });
        }

        // SECURITY: Block if reservation is closed
        if (entry.reservations?.is_closed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This reservation is closed. Contact the Competition Director.',
          });
        }
      }

      // Verify dancer belongs to same studio (for SD)
      if (ctx.userRole === 'studio_director') {
        const dancer = await prisma.dancers.findUnique({
          where: { id: input.participant.dancer_id },
          select: { studio_id: true },
        });

        if (!dancer || dancer.studio_id !== ctx.studioId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only add dancers from your own studio',
          });
        }
      }

      // Check if this dancer is already assigned to this entry
      const existingParticipant = await prisma.entry_participants.findFirst({
        where: {
          entry_id: input.entryId,
          dancer_id: input.participant.dancer_id,
        },
      });

      if (existingParticipant) {
        // Return the existing participant instead of throwing error
        return existingParticipant;
      }

      // Create new participant
      const participant = await prisma.entry_participants.create({
        data: {
          entry_id: input.entryId,
          dancer_id: input.participant.dancer_id,
          dancer_name: input.participant.dancer_name,
          dancer_age: input.participant.dancer_age,
          role: input.participant.role,
          display_order: input.participant.display_order,
          costume_size: input.participant.costume_size,
          special_needs: input.participant.special_needs,
          tenant_id: entry.tenant_id,
        },
        include: {
          dancers: true,
        },
      });

      return participant;
    }),

  // Remove participant from entry
  removeParticipant: protectedProcedure
    .input(
      z.object({
        participantId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get participant with entry details for ownership check
      const participant = await prisma.entry_participants.findUnique({
        where: { id: input.participantId },
        select: {
          id: true,
          entry_id: true,
          dancer_id: true,
          competition_entries: {
            select: {
              studio_id: true,
              status: true,
              reservations: {
                select: { is_closed: true }
              }
            }
          }
        },
      });

      if (!participant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Participant not found',
        });
      }

      // SECURITY: Verify SD owns this entry
      if (ctx.userRole === 'studio_director') {
        if (participant.competition_entries.studio_id !== ctx.studioId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only modify your own studio\'s routines',
          });
        }

        // SECURITY: Block if reservation is closed
        if (participant.competition_entries.reservations?.is_closed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This reservation is closed. Contact the Competition Director.',
          });
        }
      }

      await prisma.entry_participants.delete({
        where: { id: input.participantId },
      });

      return { success: true, message: 'Participant removed successfully' };
    }),

  // Cancel an entry
  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Get entry for ownership check
      const existingEntry = await prisma.competition_entries.findUnique({
        where: { id: input.id },
        select: {
          studio_id: true,
          status: true,
          reservations: {
            select: { is_closed: true }
          }
        },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Entry not found',
        });
      }

      // SECURITY: Verify SD owns this entry
      if (ctx.userRole === 'studio_director') {
        if (existingEntry.studio_id !== ctx.studioId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only cancel your own studio\'s routines',
          });
        }

        // SECURITY: Block if reservation is closed
        if (existingEntry.reservations?.is_closed) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This reservation is closed. Contact the Competition Director.',
          });
        }
      }

      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          status: 'cancelled',
          updated_at: new Date(),
        },
      });

      return entry;
    }),

  // Confirm an entry (draft -> registered)
  confirm: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.update({
        where: { id: input.id },
        data: {
          status: 'confirmed',
          updated_at: new Date(),
        },
      });

      return entry;
    }),

  // Update music file URL
  updateMusic: publicProcedure
    .input(
      z.object({
        entryId: z.string().uuid(),
        musicFileUrl: z.string().url().optional().nullable(),
        musicTitle: z.string().max(255).optional(),
        musicArtist: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const entry = await prisma.competition_entries.update({
        where: { id: input.entryId },
        data: {
          music_file_url: input.musicFileUrl || null,
          music_title: input.musicTitle,
          music_artist: input.musicArtist,
          updated_at: new Date(),
        },
      });

      return entry;
    }),

  // Delete an entry (Studio Directors for drafts, Competition Directors and Super Admins for all)
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      hardDelete: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch entry with reservation status
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          status: true,
          studio_id: true,
          competition_id: true,
          reservations: {
            select: {
              is_closed: true,
              status: true,
            },
          },
          studios: { select: { name: true } },
          competitions: { select: { name: true } },
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Entry not found',
        });
      }

      // Check if SD owns this entry and it's a draft
      const isSDBelongsToStudio =
        ctx.userRole === 'studio_director' &&
        ctx.studioId === entry.studio_id;
      const isDraftStatus = entry.status === 'draft';
      const isReservationOpen = !entry.reservations?.is_closed;

      // Allow SDs to hard-delete their own draft routines if reservation is open
      if (isSDBelongsToStudio && isDraftStatus && isReservationOpen) {
        // Hard delete: permanently remove entry
        await prisma.competition_entries.delete({
          where: { id: input.id },
        });

        // Log activity
        try {
          await logActivity({
            userId: ctx.userId,
            tenantId: ctx.tenantId!,
            studioId: entry.studio_id,
            action: 'entry.hard_delete',
            entityType: 'entry',
            entityId: input.id,
            details: {
              title: entry.title,
              studio_name: entry.studios?.name || 'Unknown',
              competition_name: entry.competitions?.name || 'Unknown',
              deleted_by_role: 'studio_director',
              previous_status: entry.status,
            },
          });
        } catch (err) {
          logger.error('Failed to log activity (entry.delete)', {
            error: err instanceof Error ? err : new Error(String(err))
          });
        }

        return {
          success: true,
          message: 'Draft routine permanently deleted',
          entry: {
            id: entry.id,
            title: entry.title,
            studio_name: entry.studios?.name || 'Unknown',
            competition_name: entry.competitions?.name || 'Unknown',
          },
        };
      }

      // Block SD from deleting submitted routines
      if (isSDBelongsToStudio && !isDraftStatus) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot delete submitted routines. Contact the Competition Director for assistance.',
        });
      }

      // Block SD if reservation is closed
      if (isSDBelongsToStudio && !isReservationOpen) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This reservation is closed. Contact the Competition Director to make changes.',
        });
      }

      // CDs and SAs can delete any entry (existing CD-only logic continues below)
      if (!isAdmin(ctx.userRole)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can delete entries from other studios.',
        });
      }

      if (input.hardDelete) {
        // Hard delete: permanently remove entry
        await prisma.competition_entries.delete({
          where: { id: input.id },
        });
      } else {
        // Soft delete: mark as withdrawn
        await prisma.competition_entries.update({
          where: { id: input.id },
          data: {
            status: 'withdrawn',
            updated_at: new Date(),
          },
        });
      }

      // Activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: entry.studio_id,
          action: input.hardDelete ? 'entry.hard_delete' : 'entry.soft_delete',
          entityType: 'entry',
          entityId: input.id,
          details: {
            title: entry.title,
            studio_name: entry.studios?.name || 'Unknown',
            competition_name: entry.competitions?.name || 'Unknown',
            previous_status: entry.status,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (entry.delete)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: input.hardDelete ? 'Entry permanently deleted' : 'Entry withdrawn',
        entry: {
          id: entry.id,
          title: entry.title,
          studio_name: entry.studios?.name || 'Unknown',
          competition_name: entry.competitions?.name || 'Unknown',
        },
      };
    }),

  // Get all entries for Competition Director with comprehensive filters
  getAllForCompetitionDirector: protectedProcedure
    .input(z.object({
      competitionId: z.string().uuid().optional(),
      studioId: z.string().uuid().optional(),
      status: z.enum(['draft', 'summarized', 'all']).optional(),
      categoryTypeId: z.string().uuid().optional(),
      danceCategoryId: z.string().uuid().optional(),
      ageDivisionId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Only CD and Super Admin can access this
      if (!ctx.userRole || !['competition_director', 'super_admin'].includes(ctx.userRole)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Competition Director access required' });
      }

      const where: any = {
        status: { notIn: ['cancelled', 'withdrawn'] },
      };

      // Tenant filtering
      if (isSuperAdmin(ctx.userRole)) {
        // Super admins can see all tenants
      } else if (ctx.tenantId) {
        where.competitions = { tenant_id: ctx.tenantId };
      } else {
        return { entries: [], total: 0 };
      }

      // Competition filter
      if (input.competitionId) {
        where.competition_id = input.competitionId;
      }

      // Studio filter
      if (input.studioId) {
        where.studio_id = input.studioId;
      }

      // Status filter (draft vs summarized)
      if (input.status === 'draft') {
        where.reservations = {
          status: { not: 'summarized' },
        };
      } else if (input.status === 'summarized') {
        where.reservations = {
          status: 'summarized',
        };
      }

      // Competition settings filters
      if (input.categoryTypeId) {
        where.category_id = input.categoryTypeId;
      }

      if (input.danceCategoryId) {
        where.classification_id = input.danceCategoryId;
      }

      if (input.ageDivisionId) {
        where.age_group_id = input.ageDivisionId;
      }

      const [entries, total] = await Promise.all([
        prisma.competition_entries.findMany({
          where,
          include: {
            studios: {
              select: {
                id: true,
                name: true,
              },
            },
            competitions: {
              select: {
                id: true,
                name: true,
                tenant_id: true,
                tenants: {
                  select: {
                    id: true,
                    name: true,
                    subdomain: true,
                  },
                },
              },
            },
            dance_categories: {
              select: {
                id: true,
                name: true,
              },
            },
            classifications: {
              select: {
                id: true,
                name: true,
              },
            },
            age_groups: {
              select: {
                id: true,
                name: true,
              },
            },
            entry_participants: {
              select: {
                dancer_id: true,
                dancer_name: true,
              },
            },
            reservations: {
              select: {
                id: true,
                status: true,
              },
            },
            _count: {
              select: {
                entry_participants: true,
              },
            },
          },
          orderBy: [
            { created_at: 'desc' },
          ],
        }),
        prisma.competition_entries.count({ where }),
      ]);

      return {
        entries,
        total,
      };
    }),
});
