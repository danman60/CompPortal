import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

/**
 * Valid reservation statuses - used for validation and consistency
 * - pending: Awaiting CD approval
 * - approved: CD approved, awaiting SD summary submission
 * - rejected: CD rejected the reservation
 * - cancelled: Reservation cancelled
 * - summarized: SD submitted summary, ready for invoice
 * - invoiced: Invoice created for this reservation
 * - closed: Invoice paid, reservation complete
 */
export const VALID_RESERVATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'summarized',
  'invoiced',
  'closed',
] as const;

export type ReservationStatus = typeof VALID_RESERVATION_STATUSES[number];
import { logActivity } from '@/lib/activity';
import { isStudioDirector } from '@/lib/permissions';
import { isSuperAdmin, isCompetitionDirector } from '@/lib/auth-utils';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getTenantPortalUrl } from '@/lib/tenant-url';
import {
  renderReservationApproved,
  renderReservationRejected,
  renderReservationSubmitted,
  renderReservationMoved,
  renderPaymentConfirmed,
  renderInvoiceDelivery,
  renderSpaceRequestNotification,
  renderSummaryReopened,
  getEmailSubject,
  type ReservationApprovedData,
  type ReservationRejectedData,
  type ReservationSubmittedData,
  type ReservationMovedData,
  type PaymentConfirmedData,
  type InvoiceDeliveryData,
  type SpaceRequestNotificationData,
  type SummaryReopenedData,
} from '@/lib/email-templates';
import { guardReservationStatus } from '@/lib/guards/statusGuards';
import { validateReservationCapacity } from '@/lib/validators/businessRules';
import { capacityService } from '../services/capacity';

// Validation schema for reservation input
const reservationInputSchema = z.object({
  studio_id: z.string().uuid(),
  competition_id: z.string().uuid(),
  location_id: z.string().uuid().optional(),
  spaces_requested: z.number().int().min(1).max(300),
  spaces_confirmed: z.number().int().min(0).optional(),
  agent_first_name: z.string().max(100).optional(),
  agent_last_name: z.string().max(100).optional(),
  agent_email: z.string().email().optional().or(z.literal('')),
  agent_phone: z.string().max(50).optional(),
  agent_title: z.string().max(100).optional(),
  age_of_consent: z.boolean().default(false),
  waiver_consent: z.boolean().default(false),
  media_consent: z.boolean().default(false),
  deposit_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  payment_status: z.enum(['pending', 'partial', 'paid', 'refunded', 'cancelled']).default('pending'),
  payment_due_date: z.string().optional(), // ISO date string
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('pending'),
  internal_notes: z.string().optional(),
  public_notes: z.string().optional(),
});

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

export const reservationRouter = router({
  // Get all reservations with optional filtering (role-based)
  getAll: protectedProcedure
    .input(
      z
        .object({
          studioId: z.string().uuid().optional(),
          competitionId: z.string().uuid().optional(),
          status: z.string().optional(),
          paymentStatus: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .nullish()
    )
    .query(async ({ ctx, input }) => {
      const { studioId, competitionId, status, paymentStatus, limit = 50, offset = 0 } = input ?? {};

      const where: any = {};

      // Tenant isolation (MANDATORY for all non-super-admins)
      if (!isSuperAdmin(ctx.userRole)) {
        if (!ctx.tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Tenant context required',
          });
        }
        where.tenant_id = ctx.tenantId;
      }

      // Studio directors can only see their own studio's reservations
      if (isStudioDirector(ctx.userRole)) {
        // SECURITY: Block access if studioId is missing (prevents data leak)
        if (!ctx.studioId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Studio not found. Please contact support.',
          });
        }
        where.studio_id = ctx.studioId;
      } else if (studioId) {
        // Admins can filter by studioId if provided
        where.studio_id = studioId;
      }

      if (competitionId) {
        where.competition_id = competitionId;
      }

      if (status) {
        where.status = status;
      }

      if (paymentStatus) {
        where.payment_status = paymentStatus;
      }

      // Competition Directors: hide test studios from reservations list
      if (isCompetitionDirector(ctx.userRole)) {
        where.studios = {
          OR: [
            { is_test: false },
            { is_test: null },
          ],
        };
      }

      const [reservations, total, competitions] = await Promise.all([
        prisma.reservations.findMany({
          where,
          include: {
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
                competition_start_date: true,
                registration_closes: true,
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
            competition_locations: {
              select: {
                id: true,
                name: true,
              },
            },
            invoices: {
              select: {
                id: true,
                status: true,
              },
              orderBy: {
                created_at: 'desc',
              },
              take: 1,
            },
            _count: {
              select: {
                competition_entries: true,
              },
            },
          },
          orderBy: [
            { requested_at: 'desc' },
          ],
          take: limit,
          skip: offset,
        }),
        prisma.reservations.count({ where }),
        prisma.competitions.findMany({
          where: {
            ...(isSuperAdmin(ctx.userRole) ? {} : { tenant_id: ctx.tenantId! }), // FIXED: Mandatory tenant filter for non-super-admins
            status: { in: ['upcoming', 'registration_open', 'in_progress'] }, // Show open competitions for reservation creation
          },
          select: {
            id: true,
            name: true,
            year: true,
            total_reservation_tokens: true,
            available_reservation_tokens: true,
            tokens_override_enabled: true,
            status: true,
          },
          orderBy: [
            { year: 'desc' },
            { name: 'asc' },
          ],
        }),
      ]);

      return {
        reservations,
        competitions,
        total,
        limit,
        offset,
        hasMore: offset + reservations.length < total,
      };
    }),

  // Get a single reservation by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.id },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              province: true,
              email: true,
              phone: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
              competition_end_date: true,
              entry_fee: true,
              venue_capacity: true,
            },
          },
          competition_locations: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          competition_entries: {
            select: {
              id: true,
              title: true,
            },
          },
          users_reservations_approved_byTousers: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      return reservation;
    }),

  // Get reservations by studio
  getByStudio: publicProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ input }) => {
      const reservations = await prisma.reservations.findMany({
        where: { studio_id: input.studioId },
        include: {
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              competition_start_date: true,
            },
          },
          _count: {
            select: {
              competition_entries: true,
            },
          },
        },
        orderBy: [
          { requested_at: 'desc' },
        ],
      });

      return {
        reservations,
        count: reservations.length,
      };
    }),

  // Get reservations by competition
  getByCompetition: publicProcedure
    .input(z.object({ competitionId: z.string().uuid() }))
    .query(async ({ input }) => {
      const reservations = await prisma.reservations.findMany({
        where: { competition_id: input.competitionId },
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
          _count: {
            select: {
              competition_entries: true,
            },
          },
        },
        orderBy: [
          { requested_at: 'asc' },
        ],
      });

      // Calculate total spaces
      const totalRequested = reservations.reduce((sum, r) => sum + r.spaces_requested, 0);
      const totalConfirmed = reservations.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0);

      return {
        reservations,
        count: reservations.length,
        totalRequested,
        totalConfirmed,
      };
    }),

  // Get reservation statistics
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

      const [
        total,
        pending,
        approved,
        rejected,
        byPaymentStatus,
        totalRequested,
        totalConfirmed,
      ] = await Promise.all([
        prisma.reservations.count({ where }),
        prisma.reservations.count({ where: { ...where, status: 'pending' } }),
        prisma.reservations.count({ where: { ...where, status: 'approved' } }),
        prisma.reservations.count({ where: { ...where, status: 'rejected' } }),
        prisma.reservations.groupBy({
          by: ['payment_status'],
          where,
          _count: true,
        }),
        prisma.reservations.aggregate({
          where,
          _sum: { spaces_requested: true },
        }),
        prisma.reservations.aggregate({
          where,
          _sum: { spaces_confirmed: true },
        }),
      ]);

      return {
        total,
        pending,
        approved,
        rejected,
        byPaymentStatus: byPaymentStatus.reduce((acc, item) => {
          acc[item.payment_status || 'unknown'] = item._count;
          return acc;
        }, {} as Record<string, number>),
        totalRequested: totalRequested._sum.spaces_requested || 0,
        totalConfirmed: totalConfirmed._sum.spaces_confirmed || 0,
      };
    }),

  // Create a new reservation
  create: protectedProcedure
    .input(reservationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        payment_due_date,
        deposit_amount,
        total_amount,
        ...data
      } = input;

      // Studio directors can only create reservations for their own studio
      if (isStudioDirector(ctx.userRole)) {
        if (!ctx.studioId) {
          throw new Error('Studio director must have an associated studio');
        }
        if (data.studio_id !== ctx.studioId) {
          throw new Error('Cannot create reservations for other studios');
        }
      }

      // 🆕 SOFT LIMIT: Removed hard venue_capacity check
      // Studios can request any amount - CDs can approve beyond capacity

      // 🔐 BUSINESS RULE VALIDATIONS (Wave 2.2)
      // Validate reservation capacity against competition limits
      await validateReservationCapacity(
        input.competition_id,
        input.studio_id,
        input.spaces_requested
      );

      // Get tenant_id from studio
      const studio = await prisma.studios.findUnique({
        where: { id: input.studio_id },
        select: { tenant_id: true },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Build data object without relation fields
      const { competition_id, studio_id, location_id, ...restData } = data;

      const reservation = await prisma.reservations.create({
        data: {
          ...restData,
          competitions: {
            connect: { id: competition_id },
          },
          studios: {
            connect: { id: studio_id },
          },
          ...(location_id && {
            competition_locations: {
              connect: { id: location_id },
            },
          }),
          tenants: {
            connect: { id: studio.tenant_id },
          },
          ...(payment_due_date && { payment_due_date: new Date(payment_due_date) }),
          ...(deposit_amount !== undefined && { deposit_amount: deposit_amount.toString() }),
          ...(total_amount !== undefined && { total_amount: total_amount.toString() }),
        },
        include: {
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
        },
      });

      // Send "reservation_submitted" email to Competition Directors (non-blocking)
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

        // Get studio email
        const studioWithEmail = await prisma.studios.findUnique({
          where: { id: input.studio_id },
          select: { email: true },
        });

        // Get tenant branding
        const tenant = await prisma.tenants.findUnique({
          where: { id: studio.tenant_id },
          select: { branding: true },
        });
        const branding = tenant?.branding as { primaryColor?: string; secondaryColor?: string } | null;

        // Send email to each CD who has this preference enabled
        for (const cd of competitionDirectors) {
          const isEnabled = await isEmailEnabled(cd.id, 'reservation_submitted');
          if (!isEnabled) continue;

          const cdEmail = await getUserEmail(cd.id);
          if (!cdEmail) continue;

          const emailData: ReservationSubmittedData = {
            studioName: reservation.studios?.name || 'Studio',
            competitionName: reservation.competitions?.name || 'Competition',
            competitionYear: reservation.competitions?.year || new Date().getFullYear(),
            spacesRequested: reservation.spaces_requested,
            studioEmail: studioWithEmail?.email || '',
            portalUrl: await getTenantPortalUrl(studio.tenant_id, '/dashboard/reservation-pipeline'),
            tenantBranding: branding || undefined,
          };

          const html = await renderReservationSubmitted(emailData);
          const subject = getEmailSubject('reservation-submitted', {
            studioName: emailData.studioName,
            competitionName: emailData.competitionName,
          });

          await sendEmail({
            to: cdEmail,
            subject,
            html,
            templateType: 'reservation-submitted',
            studioId: reservation.studio_id,
            competitionId: reservation.competition_id,
          });
        }
      } catch (error) {
        logger.error('Failed to send reservation submitted email to CDs', {
          error: error instanceof Error ? error : new Error(String(error)),
          reservationId: reservation.id,
        });
        // Don't throw - email failure shouldn't block the creation
      }

      return reservation;
    }),

  // Update a reservation
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: reservationInputSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        payment_due_date,
        deposit_amount,
        total_amount,
        ...data
      } = input.data;

      // Studio directors can only update their own studio's reservations
      if (isStudioDirector(ctx.userRole) && ctx.studioId) {
        const existingReservation = await prisma.reservations.findUnique({
          where: { id: input.id },
          select: { studio_id: true },
        });

        if (!existingReservation) {
          throw new Error('Reservation not found');
        }

        if (existingReservation.studio_id !== ctx.studioId) {
          throw new Error('Cannot update reservations from other studios');
        }

        // Prevent changing studio_id to another studio
        if (data.studio_id && data.studio_id !== ctx.studioId) {
          throw new Error('Cannot transfer reservations to other studios');
        }
      }

      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          ...data,
          payment_due_date: payment_due_date ? new Date(payment_due_date) : undefined,
          deposit_amount: deposit_amount?.toString(),
          total_amount: total_amount?.toString(),
          updated_at: new Date(),
        },
        include: {
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
        },
      });

      return reservation;
    }),

  // Approve a reservation
  approve: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        reservationId: z.string().uuid().optional(),
        spacesConfirmed: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only competition directors and super admins can approve reservations
      if (isStudioDirector(ctx.userRole)) {
        throw new Error('Studio directors cannot approve reservations');
      }

      // Support both id and reservationId for backwards compatibility
      const reservationId = input.reservationId || input.id;
      if (!reservationId) {
        throw new Error('Reservation ID is required');
      }

      // 🛡️ GUARD: Check current status before approving
      const existingReservation = await prisma.reservations.findUnique({
        where: { id: reservationId },
        select: { status: true },
      });

      if (!existingReservation) {
        throw new Error('Reservation not found');
      }

      // Allow CDs to approve pending reservations OR update spaces on approved ones
      guardReservationStatus(
        existingReservation.status as 'pending' | 'approved' | 'rejected',
        ['pending', 'approved'],
        'approve or update reservation'
      );

      // Reserve capacity atomically (includes status update to prevent double-processing)
      // Matches Phase 1 spec lines 442-499 (approval process)
      // 🆕 SOFT LIMIT: Capacity can go negative, returns warning if exceeded
      const spacesConfirmed = input.spacesConfirmed || 0;
      let capacityWarning: string | undefined;

      if (spacesConfirmed > 0) {
        try {
          const competitionId = (await prisma.reservations.findUnique({
            where: { id: reservationId },
            select: { competition_id: true }
          }))!.competition_id;

          // ⚡ ATOMIC: CapacityService.reserve() now handles both capacity + status update
          const result = await capacityService.reserve(
            competitionId,
            spacesConfirmed,
            reservationId,
            ctx.userId
          );

          // 🆕 Generate warning if capacity exceeded
          if (result.exceededBy > 0) {
            capacityWarning = `⚠️ Capacity exceeded by ${result.exceededBy} spaces (Available: ${result.availableBefore}, Approved: ${spacesConfirmed}, New Available: ${result.availableAfter})`;

            // Log warning for audit trail
            logger.warn('CD approved reservation beyond capacity', {
              reservationId,
              competitionId,
              exceededBy: result.exceededBy,
              availableBefore: result.availableBefore,
              approvedSpaces: spacesConfirmed,
              availableAfter: result.availableAfter,
              userId: ctx.userId,
            });
          }
        } catch (capacityError) {
          // If capacity reservation fails, don't proceed with approval
          throw new Error(
            capacityError instanceof Error
              ? capacityError.message
              : 'Failed to reserve capacity'
          );
        }
      }

      // Fetch updated reservation for email (status already updated by CapacityService)
      const reservation = await prisma.reservations.findUnique({
        where: { id: reservationId },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              entry_fee: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found after approval');
      }

      // Activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          tenantId: ctx.tenantId ?? undefined,
          studioId: reservation.studio_id,
          action: 'reservation.approve',
          entityType: 'reservation',
          entityId: reservation.id,
          details: {
            studio_id: reservation.studio_id,
            competition_id: reservation.competition_id,
            routines_requested: reservation.spaces_requested,
            routines_confirmed: reservation.spaces_confirmed,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (reservation.approve)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      // Send approval email to studio (check preferences first)
      console.log('[EMAIL DEBUG] Starting email flow for reservation approval', {
        reservationId: reservation.id,
        studioEmail: reservation.studios?.email,
        studioId: reservation.studio_id
      });

      if (reservation.studios?.email) {
        try {
          // Get studio owner to check preferences
          const studio = await prisma.studios.findUnique({
            where: { id: reservation.studio_id },
            select: { owner_id: true },
          });

          console.log('[EMAIL DEBUG] Studio owner check', { ownerId: studio?.owner_id });

          if (studio?.owner_id) {
            const isEnabled = await isEmailEnabled(studio.owner_id, 'reservation_approved');

            console.log('[EMAIL DEBUG] Email preference check', { isEnabled });

            if (isEnabled) {
              // Get tenant_id and branding for URL generation and email styling
              const reservationTenant = await prisma.reservations.findUnique({
                where: { id: reservation.id },
                select: { tenant_id: true },
              });

              const tenantBrandingData = await prisma.tenants.findUnique({
                where: { id: reservationTenant!.tenant_id },
                select: { branding: true },
              });
              const branding = tenantBrandingData?.branding as { primaryColor?: string; secondaryColor?: string } | null;

              const emailData: ReservationApprovedData = {
                studioName: reservation.studios.name,
                competitionName: reservation.competitions?.name || 'Competition',
                competitionYear: reservation.competitions?.year || new Date().getFullYear(),
                spacesConfirmed: reservation.spaces_confirmed || 0,
                portalUrl: await getTenantPortalUrl(reservationTenant!.tenant_id, '/dashboard/entries'),
                tenantBranding: branding || undefined,
              };

              const html = await renderReservationApproved(emailData);
              const subject = getEmailSubject('reservation-approved', {
                competitionName: emailData.competitionName,
                competitionYear: emailData.competitionYear,
              });

              console.log('[EMAIL DEBUG] About to send email', {
                to: reservation.studios.email,
                templateType: 'reservation-approved'
              });

              const result = await sendEmail({
                to: reservation.studios.email,
                subject,
                html,
                templateType: 'reservation-approved',
                studioId: reservation.studio_id,
                competitionId: reservation.competition_id,
              });

              console.log('[EMAIL DEBUG] Email send result', result);
            } else {
              console.log('[EMAIL DEBUG] Email disabled by user preference');
            }
          } else {
            console.log('[EMAIL DEBUG] No studio owner_id found');
          }
        } catch (error) {
          console.error('[EMAIL DEBUG] Email error caught', error);
          logger.error('Failed to send approval email', { error: error instanceof Error ? error : new Error(String(error)) });
          // Don't throw - email failure shouldn't block the approval
        }
      } else {
        console.log('[EMAIL DEBUG] No studio email found');
      }

      // 🆕 Return warning if capacity exceeded
      return {
        ...reservation,
        ...(capacityWarning && { capacityWarning }),
      };
    }),

  // Reject a reservation
  reject: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only competition directors and super admins can reject reservations
      if (isStudioDirector(ctx.userRole)) {
        throw new Error('Studio directors cannot reject reservations');
      }

      // First, get the current reservation to check if it was approved
      const existingReservation = await prisma.reservations.findUnique({
        where: { id: input.id },
        select: {
          status: true,
          spaces_confirmed: true,
          competition_id: true,
        },
      });

      // If rejecting a previously approved reservation, release tokens back (Issue #16)
      if (existingReservation?.status === 'approved' && existingReservation.spaces_confirmed) {
        await prisma.competitions.update({
          where: { id: existingReservation.competition_id },
          data: {
            available_reservation_tokens: {
              increment: existingReservation.spaces_confirmed,
            },
          },
        });
      }

      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          status: 'rejected',
          internal_notes: input.reason,
          approved_by: ctx.userId,
          updated_at: new Date(),
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              contact_email: true,
            },
          },
        },
      });

      // Send rejection email to studio (check preferences first)
      if (reservation.studios?.email) {
        try {
          // Get studio owner to check preferences
          const studio = await prisma.studios.findUnique({
            where: { id: reservation.studio_id },
            select: { owner_id: true },
          });

          if (studio?.owner_id) {
            const isEnabled = await isEmailEnabled(studio.owner_id, 'reservation_rejected');

            if (isEnabled) {
              // Get tenant_id and branding for URL generation and email styling
              const reservationTenant = await prisma.reservations.findUnique({
                where: { id: reservation.id },
                select: { tenant_id: true },
              });

              const tenantBrandingData = await prisma.tenants.findUnique({
                where: { id: reservationTenant!.tenant_id },
                select: { branding: true },
              });
              const branding = tenantBrandingData?.branding as { primaryColor?: string; secondaryColor?: string } | null;

              const emailData: ReservationRejectedData = {
                studioName: reservation.studios.name,
                competitionName: reservation.competitions?.name || 'Competition',
                competitionYear: reservation.competitions?.year || new Date().getFullYear(),
                reason: input.reason,
                portalUrl: await getTenantPortalUrl(reservationTenant!.tenant_id, '/dashboard/reservations'),
                contactEmail: reservation.competitions?.contact_email || process.env.EMAIL_FROM || 'info@glowdance.com',
                tenantBranding: branding || undefined,
              };

              const html = await renderReservationRejected(emailData);
              const subject = getEmailSubject('reservation-rejected', {
                competitionName: emailData.competitionName,
                competitionYear: emailData.competitionYear,
              });

              await sendEmail({
                to: reservation.studios.email,
                subject,
                html,
                templateType: 'reservation-rejected',
                studioId: reservation.studio_id,
                competitionId: reservation.competition_id,
              });
            }
          }
        } catch (error) {
          logger.error('Failed to send rejection email', { error: error instanceof Error ? error : new Error(String(error)) });
          // Don't throw - email failure shouldn't block the rejection
        }
      }

      // Activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          tenantId: ctx.tenantId ?? undefined,
          studioId: reservation.studio_id,
          action: 'reservation.reject',
          entityType: 'reservation',
          entityId: reservation.id,
          details: {
            studio_id: reservation.studio_id,
            competition_id: reservation.competition_id,
            rejection_reason: input.reason || 'No reason provided',
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (reservation.reject)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return reservation;
    }),

  // Cancel a reservation
  cancel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // First, get the reservation to check status and permission
      const existingReservation = await prisma.reservations.findUnique({
        where: { id: input.id },
        select: {
          studio_id: true,
          status: true,
          spaces_confirmed: true,
          competition_id: true,
        },
      });

      if (!existingReservation) {
        throw new Error('Reservation not found');
      }

      // Studio directors can only cancel their own studio's reservations
      if (isStudioDirector(ctx.userRole) && ctx.studioId) {
        if (existingReservation.studio_id !== ctx.studioId) {
          throw new Error('Cannot cancel reservations from other studios');
        }
      }

      // If cancelling an approved reservation, release tokens back (Issue #16)
      if (existingReservation.status === 'approved' && existingReservation.spaces_confirmed) {
        await prisma.competitions.update({
          where: { id: existingReservation.competition_id },
          data: {
            available_reservation_tokens: {
              increment: existingReservation.spaces_confirmed,
            },
          },
        });
      }

      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          status: 'cancelled',
          updated_at: new Date(),
        },
      });

      return reservation;
    }),

  // Delete a reservation
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Studio directors can only delete their own studio's reservations
      if (isStudioDirector(ctx.userRole) && ctx.studioId) {
        const existingReservation = await prisma.reservations.findUnique({
          where: { id: input.id },
          select: { studio_id: true },
        });

        if (!existingReservation) {
          throw new Error('Reservation not found');
        }

        if (existingReservation.studio_id !== ctx.studioId) {
          throw new Error('Cannot delete reservations from other studios');
        }
      }

      // Check if reservation has entries
      const entriesCount = await prisma.competition_entries.count({
        where: { reservation_id: input.id },
      });

      if (entriesCount > 0) {
        throw new Error(
          `Cannot delete reservation with ${entriesCount} entries. Cancel instead.`
        );
      }

      await prisma.reservations.delete({
        where: { id: input.id },
      });

      return { success: true, message: 'Reservation deleted successfully' };
    }),

  // Mark payment as confirmed (Competition Directors only)
  markAsPaid: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        paymentStatus: z.enum(['pending', 'partial', 'paid', 'refunded', 'cancelled']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only competition directors and super admins can confirm payments
      if (isStudioDirector(ctx.userRole)) {
        throw new Error('Studio directors cannot confirm payments');
      }

      // 🛡️ GUARD: Verify reservation exists and has invoice
      const existingReservation = await prisma.reservations.findUnique({
        where: { id: input.id },
        select: { id: true, status: true },
      });

      if (!existingReservation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reservation not found'
        });
      }

      // 🛡️ GUARD: Validate reservation is in invoiced state
      if (existingReservation.status !== 'invoiced') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: `Cannot mark as paid: reservation must be in 'invoiced' state (current: ${existingReservation.status}). Please create invoice first.`
        });
      }

      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          payment_status: input.paymentStatus,
          status: 'closed', // Phase 1 spec: invoiced → closed on payment
          is_closed: true,
          payment_confirmed_at: new Date(),
          payment_confirmed_by: ctx.userId,
          updated_at: new Date(),
        },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
        },
      });

      // Activity logging for payment (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          tenantId: ctx.tenantId ?? undefined,
          studioId: reservation.studio_id,
          action: 'invoice.markAsPaid',
          entityType: 'invoice',
          entityId: reservation.id,
          details: {
            studio_id: reservation.studio_id,
            competition_id: reservation.competition_id,
            payment_status: reservation.payment_status,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (invoice.markAsPaid)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      // Send payment confirmation email
      try {
        if (reservation.studios.email && reservation.competitions) {
          // Get invoice data for the email
          const invoice = await prisma.invoices.findFirst({
            where: {
              studio_id: reservation.studio_id,
              competition_id: reservation.competition_id,
            },
            select: {
              id: true,
              total: true,
            },
          });

          // Get tenant branding
          const tenantBrandingData = await prisma.tenants.findUnique({
            where: { id: ctx.tenantId! },
            select: { branding: true },
          });
          const branding = tenantBrandingData?.branding as { primaryColor?: string; secondaryColor?: string } | null;

          const emailData: PaymentConfirmedData = {
            studioName: reservation.studios.name,
            competitionName: reservation.competitions.name,
            competitionYear: reservation.competitions.year,
            amount: invoice?.total ? parseFloat(invoice.total.toString()) : 0,
            paymentStatus: input.paymentStatus,
            invoiceNumber: invoice?.id,
            paymentDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            tenantBranding: branding || undefined,
          };

          const html = await renderPaymentConfirmed(emailData);
          const subject = getEmailSubject('payment-confirmed', {
            paymentStatus: input.paymentStatus,
            competitionName: reservation.competitions.name,
            competitionYear: reservation.competitions.year,
          });

          await sendEmail({
            to: reservation.studios.email,
            subject,
            html,
            templateType: 'payment-confirmed',
            studioId: reservation.studio_id,
            competitionId: reservation.competition_id,
          });
        }
      } catch (emailError) {
        logger.error('Failed to send payment confirmation email', { error: emailError instanceof Error ? emailError : new Error(String(emailError)) });
        // Don't fail the mutation if email fails
      }

      return reservation;
    }),

  // Manual reservation creation (admin-only)
  createManual: protectedProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
        studioId: z.string().uuid(),
        spacesAllocated: z.number().int().min(1).max(600),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check user role - only competition directors and super admins
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (!userProfile || (userProfile.role !== 'competition_director' && userProfile.role !== 'super_admin')) {
        throw new Error('Unauthorized: Only competition directors can create manual reservations');
      }

      // Verify competition exists
      // 🆕 SOFT LIMIT: Removed hard capacity check - CDs can allocate beyond capacity
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        select: {
          id: true,
          name: true,
          available_reservation_tokens: true,
          total_reservation_tokens: true,
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      // Verify studio exists
      const studio = await prisma.studios.findUnique({
        where: { id: input.studioId },
        select: { id: true, name: true },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Check if reservation already exists for this studio/competition
      const existingReservation = await prisma.reservations.findFirst({
        where: {
          studio_id: input.studioId,
          competition_id: input.competitionId,
          status: { in: ['pending', 'approved'] },
        },
      });

      if (existingReservation) {
        throw new Error('Studio already has a reservation for this competition');
      }

      // Create pre-approved reservation
      const reservation = await prisma.reservations.create({
        data: {
          studio_id: input.studioId,
          competition_id: input.competitionId,
          tenant_id: ctx.tenantId!,
          spaces_requested: input.spacesAllocated,
          spaces_confirmed: input.spacesAllocated,
          status: 'approved',
          approved_at: new Date(),
          approved_by: ctx.userId,
          internal_notes: 'Manual reservation created by admin',
          payment_status: 'pending',
        },
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
            },
          },
        },
      });

      // Auto-adjust competition capacity (Issue #16)
      await prisma.competitions.update({
        where: { id: input.competitionId },
        data: {
          available_reservation_tokens: {
            decrement: input.spacesAllocated,
          },
        },
      });

      return reservation;
    }),

  // Get pipeline view (aggregated data for CRM dashboard)
  getPipelineView: protectedProcedure.query(async ({ ctx }) => {
    // Only competition directors and super admins can view pipeline
    if (isStudioDirector(ctx.userRole)) {
      throw new Error('Studio directors cannot access the reservation pipeline');
    }

    // Fetch all reservations with related data (tenant-scoped)
    const reservations = await prisma.reservations.findMany({
      where: {
        tenant_id: ctx.tenantId!,
      },
      include: {
        studios: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            province: true,
            email: true,
            phone: true,
            address1: true,
            created_at: true,
          },
        },
        competitions: {
          select: {
            id: true,
            name: true,
            year: true,
            competition_start_date: true,
            competition_end_date: true,
            primary_location: true,
            venue_capacity: true,
          },
        },
        invoices: {
          select: {
            id: true,
            total: true,
            status: true,
            paid_at: true,
          },
          take: 1,
        },
        _count: {
          select: {
            competition_entries: true,
          },
        },
      },
      orderBy: [
        { requested_at: 'desc' },
      ],
    });

    // Transform data for frontend
    const transformedReservations = reservations.map(r => {
      const invoice = r.invoices?.[0];

      return {
        id: r.id,
        studioId: r.studio_id,
        studioName: r.studios?.name || 'Unknown Studio',
        studioCode: r.studios?.code || null,
        studioCity: r.studios?.city || '',
        studioProvince: r.studios?.province || '',
        studioAddress: r.studios?.address1 || '',
        studioCreatedAt: r.studios?.created_at,
        contactName: r.agent_first_name && r.agent_last_name
          ? `${r.agent_first_name} ${r.agent_last_name}`
          : null,
        contactEmail: r.studios?.email || '',
        contactPhone: r.studios?.phone || '',
        competitionId: r.competition_id,
        competitionName: r.competitions?.name || 'Unknown Competition',
        competitionYear: r.competitions?.year || new Date().getFullYear(),
        spacesRequested: r.spaces_requested,
        spacesConfirmed: r.spaces_confirmed || 0,
        entryCount: r._count?.competition_entries || 0,
        status: r.status,
        invoiceId: invoice?.id || null,
        invoiceStatus: invoice?.status || null,
        totalAmount: invoice?.total ? parseFloat(invoice.total.toString()) : null,
        invoicePaid: !!invoice?.paid_at,
        lastAction: r.status === 'approved' ? 'Approved by You' : 'Reservation submitted',
        lastActionDate: r.approved_at || r.requested_at,
        // Pending space request
        pendingAdditionalSpaces: r.pending_additional_spaces || null,
        pendingSpacesJustification: r.pending_spaces_justification || null,
        pendingSpacesRequestedAt: r.pending_spaces_requested_at || null,
        pendingSpacesRequestedBy: r.pending_spaces_requested_by || null,
      };
    });

    return {
      reservations: transformedReservations,
    };
  }),

  // Pipeline V2 - Enhanced view with display status and issue detection
  getPipelineViewV2: protectedProcedure.query(async ({ ctx }) => {
    // Only competition directors and super admins can view pipeline
    if (isStudioDirector(ctx.userRole)) {
      throw new Error('Studio directors cannot access the reservation pipeline');
    }

    // Helper: Derive human-readable display status
    const deriveDisplayStatus = (
      status: string | null,
      hasSummary: boolean,
      invoice: { status: string | null } | null
    ): string => {
      // Check for data integrity issues first
      if (status === 'summarized' && !hasSummary) {
        return 'needs_attention';
      }

      // Check reservation status FIRST - this takes priority
      // When summary is reopened (reopenSummary), status is set to 'approved' -> Awaiting Submission
      // When invoice is voided (voidInvoice), status stays 'summarized' -> Ready to Invoice
      switch (status) {
        case 'pending': return 'pending_review';
        case 'approved': return 'approved'; // Awaiting Submission from SD (never submitted OR reopened)
        case 'rejected': return 'rejected';
        case 'summarized':
          // Summary exists, ready for CD to create invoice
          return 'ready_to_invoice';
        case 'invoiced':
          // Only check invoice status for 'invoiced' reservations
          if (invoice) {
            if (invoice.status === 'PAID') return 'paid_complete';
            if (invoice.status === 'SENT') return 'invoice_sent';
            if (invoice.status === 'DRAFT') return 'invoice_sent';
            // VOID/VOIDED with 'invoiced' status = data inconsistency (should have been set back to summarized)
            if (invoice.status === 'VOIDED' || invoice.status === 'VOID') {
              return 'needs_attention';
            }
          }
          return 'needs_attention'; // invoiced status but no invoice
        case 'closed':
          // Reservation is complete - invoice paid
          return 'paid_complete';
        default: return 'needs_attention';
      }
    };

    // Helper: Detect data integrity issues
    const detectDataIntegrityIssue = (
      status: string | null,
      hasSummary: boolean,
      invoice: { status: string | null } | null
    ): string | null => {
      if (status === 'summarized' && !hasSummary) {
        return 'STATUS_MISMATCH: Status is summarized but no summary record exists';
      }
      // Skip status mismatch check for voided invoices - treat as no invoice
      const isVoidedInvoice = invoice?.status === 'VOID' || invoice?.status === 'VOIDED';
      // Valid statuses when invoice exists: invoiced, summarized, closed
      if (invoice && !isVoidedInvoice && status !== 'invoiced' && status !== 'summarized' && status !== 'closed') {
        return 'STATUS_MISMATCH: Invoice exists but reservation status is not invoiced';
      }
      // Don't flag voided invoices as issues - they're ready for new invoice
      return null;
    };

    // Fetch all reservations with extended data (exclude cancelled and rejected)
    const reservations = await prisma.reservations.findMany({
      where: {
        tenant_id: ctx.tenantId!,
        status: {
          notIn: ['cancelled', 'rejected'],
        },
        // Hide test studios from CD pipeline view
        studios: {
          OR: [
            { is_test: false },
            { is_test: null },
          ],
        },
      },
      select: {
        // Main reservation fields
        id: true,
        studio_id: true,
        competition_id: true,
        spaces_requested: true,
        spaces_confirmed: true,
        agent_first_name: true,
        agent_last_name: true,
        status: true,
        deposit_amount: true,
        deposit_paid_at: true,
        approved_at: true,
        approved_by: true,
        internal_notes: true,
        requested_at: true,
        // Relations
        studios: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            province: true,
            email: true,
            phone: true,
            address1: true,
            created_at: true,
            owner_id: true,
          },
        },
        competitions: {
          select: {
            id: true,
            name: true,
            year: true,
            competition_start_date: true,
            competition_end_date: true,
            primary_location: true,
            venue_capacity: true,
          },
        },
        invoices: {
          where: {
            status: { notIn: ['VOIDED', 'VOID'] },
          },
          select: {
            id: true,
            total: true,
            status: true,
            amount_paid: true,
            balance_remaining: true,
            paid_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        summaries: {
          select: {
            id: true,
            submitted_at: true,
          },
        },
        _count: {
          select: {
            competition_entries: true,
          },
        },
        // Pending space request fields
        pending_additional_spaces: true,
        pending_spaces_justification: true,
        pending_spaces_requested_at: true,
        pending_spaces_requested_by: true,
      },
      orderBy: [
        { requested_at: 'desc' },
      ],
    });

    // Transform data for frontend
    const transformedReservations = reservations.map(r => {
      const invoice = r.invoices?.[0] || null;
      const summary = r.summaries || null; // singular relation, not array
      const hasSummary = !!summary;

      const displayStatus = deriveDisplayStatus(r.status, hasSummary, invoice);
      const hasIssue = detectDataIntegrityIssue(r.status, hasSummary, invoice);

      return {
        id: r.id,
        studioId: r.studio_id,
        studioName: r.studios?.name || 'Unknown Studio',
        studioCode: r.studios?.code || null,
        studioCity: r.studios?.city || '',
        studioProvince: r.studios?.province || '',
        studioAddress: r.studios?.address1 || '',
        studioCreatedAt: r.studios?.created_at,
        contactName: r.agent_first_name && r.agent_last_name
          ? `${r.agent_first_name} ${r.agent_last_name}`
          : null,
        contactEmail: r.studios?.email || '',
        contactPhone: r.studios?.phone || '',
        competitionId: r.competition_id,
        competitionName: r.competitions?.name || 'Unknown Competition',
        competitionYear: r.competitions?.year || new Date().getFullYear(),
        spacesRequested: r.spaces_requested,
        spacesConfirmed: r.spaces_confirmed || 0,
        entryCount: r._count?.competition_entries || 0,
        status: r.status,
        // Deposit
        depositAmount: r.deposit_amount ? parseFloat(r.deposit_amount.toString()) : 0,
        depositPaidAt: r.deposit_paid_at,
        // Approval
        approvedAt: r.approved_at,
        approvedBy: r.approved_by,
        rejectionReason: null, // Not in schema - stored in internal_notes if needed
        internalNotes: r.internal_notes,
        // Summary
        hasSummary,
        summaryId: summary?.id || null,
        summarySubmittedAt: summary?.submitted_at || null,
        // Invoice
        invoiceId: invoice?.id || null,
        invoiceNumber: null, // Not available in schema
        invoiceStatus: invoice?.status || null,
        invoiceAmount: invoice?.total ? parseFloat(invoice.total.toString()) : null,
        invoiceAmountPaid: invoice?.amount_paid ? parseFloat(invoice.amount_paid.toString()) : null,
        invoiceBalanceRemaining: invoice?.balance_remaining != null ? parseFloat(invoice.balance_remaining.toString()) : null,
        invoiceSentAt: null, // Not available in schema
        invoicePaidAt: invoice?.paid_at || null,
        invoiceDueDate: null, // Not available in schema
        // Derived
        displayStatus,
        hasIssue,
        // Last action
        lastAction: r.status === 'approved' ? 'Approved' : 'Reservation submitted',
        lastActionDate: r.approved_at || r.requested_at,
        // Pending space request
        pendingAdditionalSpaces: r.pending_additional_spaces || null,
        pendingSpacesJustification: r.pending_spaces_justification || null,
        pendingSpacesRequestedAt: r.pending_spaces_requested_at || null,
        pendingSpacesRequestedBy: r.pending_spaces_requested_by || null,
        // Studio claim status - indicates if studio has an active owner
        isStudioClaimed: !!r.studios?.owner_id,
      };
    });

    return {
      reservations: transformedReservations,
    };
  }),

  // Reduce reservation capacity with routine impact warnings
  reduceCapacity: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        newCapacity: z.number().int().min(0),
        confirmed: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check user role - only competition directors and super admins
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (!userProfile || (userProfile.role !== 'competition_director' && userProfile.role !== 'super_admin')) {
        throw new Error('Unauthorized: Only competition directors can reduce reservation capacity');
      }

      // Get reservation with current data
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.id },
        include: {
          studios: { select: { name: true } },
          competitions: { select: { name: true, year: true } },
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      const currentCapacity = reservation.spaces_confirmed || 0;

      // Validate new capacity is less than current
      if (input.newCapacity >= currentCapacity) {
        throw new Error('New capacity must be less than current capacity to reduce');
      }

      // Count existing routines for this reservation
      const routineCount = await prisma.competition_entries.count({
        where: { reservation_id: input.id },
      });

      // Check if reduction would impact existing routines
      const wouldImpactRoutines = routineCount > input.newCapacity;
      const impactedRoutines = Math.max(0, routineCount - input.newCapacity);

      // If not confirmed and would impact routines, return warning
      if (!input.confirmed && wouldImpactRoutines) {
        throw new Error(
          JSON.stringify({
            requiresConfirmation: true,
            currentCapacity,
            newCapacity: input.newCapacity,
            existingRoutines: routineCount,
            impactedRoutines,
            warning: `This studio has ${routineCount} routines created. Reducing to ${input.newCapacity} spaces means ${impactedRoutines} routine(s) will exceed the new limit. The studio will need to remove or reassign these routines.`,
          })
        );
      }

      // Proceed with reduction (either no impact or confirmed)
      const updatedReservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          spaces_confirmed: input.newCapacity,
          updated_at: new Date(),
        },
        include: {
          studios: { select: { id: true, name: true } },
          competitions: { select: { id: true, name: true, year: true } },
        },
      });

      // Adjust competition capacity (return spaces)
      const capacityIncrease = currentCapacity - input.newCapacity;
      await prisma.competitions.update({
        where: { id: reservation.competition_id },
        data: {
          available_reservation_tokens: {
            increment: capacityIncrease,
          },
        },
      });

      return {
        reservation: updatedReservation,
        capacityReduced: capacityIncrease,
        existingRoutines: routineCount,
        impact: wouldImpactRoutines ? `${impactedRoutines} routine(s) now exceed capacity` : 'No routines impacted',
      };
    }),

  // Adjust reservation spaces (increase or decrease) with proper capacity management
  adjustReservationSpaces: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        newSpacesConfirmed: z.number().int().min(0),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check user role - only competition directors and super admins
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (!userProfile || (userProfile.role !== 'competition_director' && userProfile.role !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can adjust reservation spaces',
        });
      }

      // Get reservation with current data
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: { select: { id: true, name: true } },
          competitions: { select: { id: true, name: true, year: true } },
        },
      });

      if (!reservation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reservation not found',
        });
      }

      const currentSpaces = reservation.spaces_confirmed || 0;
      const delta = input.newSpacesConfirmed - currentSpaces;

      // No change needed
      if (delta === 0) {
        return {
          reservation,
          message: 'No changes made - spaces already at this amount',
        };
      }

      // Count existing entries for this reservation
      const entryCount = await prisma.competition_entries.count({
        where: {
          reservation_id: input.reservationId,
          status: { not: 'cancelled' },
        },
      });

      // Validate: Cannot reduce below entry count
      if (input.newSpacesConfirmed < entryCount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot reduce to ${input.newSpacesConfirmed} spaces - studio has ${entryCount} entries created. Minimum allowed: ${entryCount}`,
        });
      }

      // Perform capacity adjustment based on delta
      // 🆕 SOFT LIMIT: Capacity can go negative, track if exceeded
      let capacityWarning: string | undefined;

      if (delta > 0) {
        // Increasing spaces - reserve additional capacity (can go negative)
        const result = await capacityService.reserve(
          reservation.competition_id,
          delta,
          input.reservationId,
          ctx.userId!,
          'cd_adjustment_increase'
        );

        // Generate warning if capacity exceeded
        if (result.exceededBy > 0) {
          capacityWarning = `⚠️ Capacity exceeded by ${result.exceededBy} spaces (Available: ${result.availableBefore}, Increase: ${delta}, New Available: ${result.availableAfter})`;

          logger.warn('CD adjustment increased beyond capacity', {
            reservationId: input.reservationId,
            competitionId: reservation.competition_id,
            exceededBy: result.exceededBy,
            availableBefore: result.availableBefore,
            delta,
            availableAfter: result.availableAfter,
            userId: ctx.userId,
          });
        }
      } else {
        // Decreasing spaces - refund capacity
        await capacityService.refund(
          reservation.competition_id,
          Math.abs(delta),
          input.reservationId,
          'cd_adjustment_decrease',
          ctx.userId!
        );
      }

      // Update reservation spaces_confirmed
      const updatedReservation = await prisma.reservations.update({
        where: { id: input.reservationId },
        data: {
          spaces_confirmed: input.newSpacesConfirmed,
          updated_at: new Date(),
        },
        include: {
          studios: { select: { id: true, name: true } },
          competitions: { select: { id: true, name: true, year: true } },
        },
      });

      // Log activity
      await logActivity({
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        action: 'reservation_spaces_adjusted',
        entityType: 'reservation',
        entityId: input.reservationId,
        details: {
          previous_spaces: currentSpaces,
          new_spaces: input.newSpacesConfirmed,
          delta,
          reason: input.reason || 'CD adjustment',
          studio_name: reservation.studios?.name,
          competition_name: reservation.competitions?.name,
        },
      });

      return {
        reservation: updatedReservation,
        previousSpaces: currentSpaces,
        newSpaces: input.newSpacesConfirmed,
        delta,
        entryCount,
        message: delta > 0
          ? `Increased reservation by ${delta} spaces`
          : `Decreased reservation by ${Math.abs(delta)} spaces`,
        // 🆕 Include warning if capacity exceeded
        ...(capacityWarning && { capacityWarning }),
      };
    }),

  // SD Request Space Increase (with 90% capacity check)
  requestSpaceIncrease: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        requestedIncrease: z.number().int().min(1).max(50), // Max 50 space increase at once
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only Studio Directors can request increases for their own reservations
      if (ctx.userRole !== 'studio_director') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Studio Directors can request space increases',
        });
      }

      // Get reservation with competition data
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: { select: { id: true, name: true, owner_id: true } },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              total_reservation_tokens: true,
              available_reservation_tokens: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reservation not found',
        });
      }

      // Verify SD owns this studio
      if (reservation.studios.owner_id !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only modify your own studio\'s reservations',
        });
      }

      // Check if reservation is closed
      if (reservation.is_closed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This reservation is closed. Contact the Competition Director to make changes.',
        });
      }

      // 🆕 SOFT LIMIT: Removed 90% threshold and availability checks
      // Studios can request increases beyond capacity (soft limit applies)
      const currentSpaces = reservation.spaces_confirmed || 0;
      const actualIncrease = input.requestedIncrease;
      const newSpaces = currentSpaces + actualIncrease;

      // Use capacity service for atomic reservation (can go negative)
      const result = await capacityService.reserve(
        reservation.competition_id,
        actualIncrease,
        input.reservationId,
        ctx.userId!,
        'cd_adjustment_increase' // Reuse existing reason (treated as SD self-adjustment)
      );

      // Log warning if capacity exceeded
      if (result.exceededBy > 0) {
        logger.warn('SD requested space increase beyond capacity', {
          reservationId: input.reservationId,
          competitionId: reservation.competition_id,
          exceededBy: result.exceededBy,
          availableBefore: result.availableBefore,
          requestedIncrease: actualIncrease,
          availableAfter: result.availableAfter,
          userId: ctx.userId,
        });
      }

      // Update reservation spaces_confirmed
      const updatedReservation = await prisma.reservations.update({
        where: { id: input.reservationId },
        data: {
          spaces_confirmed: newSpaces,
          updated_at: new Date(),
        },
        include: {
          studios: { select: { id: true, name: true } },
          competitions: { select: { id: true, name: true, year: true } },
        },
      });

      // Log activity
      await logActivity({
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        action: 'reservation_space_increase_requested',
        entityType: 'reservation',
        entityId: input.reservationId,
        details: {
          previous_spaces: currentSpaces,
          new_spaces: newSpaces,
          increase: actualIncrease,
          requested_increase: input.requestedIncrease,
          studio_name: reservation.studios.name,
          competition_name: reservation.competitions.name,
          requested_by_role: 'studio_director',
          // 🆕 No longer tracking utilization % (soft limit allows over-booking)
          exceeded_capacity: result.exceededBy > 0,
          exceeded_by: result.exceededBy,
        },
      });

      return {
        reservation: updatedReservation,
        previousSpaces: currentSpaces,
        newSpaces,
        increase: actualIncrease,
        message: `Your reservation was increased to ${newSpaces} spaces!`,
        // 🆕 Include warning if capacity exceeded
        ...(result.exceededBy > 0 && {
          capacityWarning: `⚠️ Competition capacity exceeded by ${result.exceededBy} spaces. Contact Competition Director if needed.`,
        }),
      };
    }),

  // Record deposit payment for a reservation
  recordDeposit: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        depositAmount: z.number().min(0),
        paymentMethod: z.enum(['cash', 'check', 'etransfer', 'credit_card', 'other']).optional(),
        paymentDate: z.string().optional(), // ISO date string
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check user role - only competition directors and super admins
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (!userProfile || (userProfile.role !== 'competition_director' && userProfile.role !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can record deposits',
        });
      }

      // Get reservation with studio and competition info
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: { select: { id: true, name: true } },
          competitions: { select: { id: true, name: true } },
        },
      });

      if (!reservation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Reservation not found',
        });
      }

      // Validate reservation status - must be approved or later
      if (!['approved', 'summarized', 'invoiced', 'paid'].includes(reservation.status || '')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot record deposit - reservation must be approved first',
        });
      }

      // Update reservation with deposit information
      const updatedReservation = await prisma.reservations.update({
        where: { id: input.reservationId },
        data: {
          deposit_amount: input.depositAmount,
          deposit_paid_at: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          deposit_confirmed_by: ctx.userId,
          updated_at: new Date(),
        },
        include: {
          studios: { select: { id: true, name: true } },
          competitions: { select: { id: true, name: true } },
        },
      });

      // 🔄 SYNC: Update existing invoice if one exists for this reservation
      const existingInvoice = await prisma.invoices.findFirst({
        where: {
          reservation_id: input.reservationId,
          status: { notIn: ['VOIDED', 'DRAFT'] }
        }
      });

      if (existingInvoice) {
        const newAmountDue = Number(existingInvoice.total) - input.depositAmount;
        const newBalanceRemaining = newAmountDue - Number(existingInvoice.amount_paid || 0);

        await prisma.invoices.update({
          where: { id: existingInvoice.id },
          data: {
            deposit_amount: input.depositAmount.toString(),
            amount_due: newAmountDue.toString(),
            balance_remaining: newBalanceRemaining.toString(),
            updated_at: new Date(),
          }
        });

        console.log('[DEPOSIT_SYNC] Synced deposit to invoice:', {
          invoice_id: existingInvoice.id,
          deposit: input.depositAmount,
          new_amount_due: newAmountDue,
          new_balance: newBalanceRemaining,
        });
      }

      // Log activity
      await logActivity({
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        action: 'deposit_recorded',
        entityType: 'reservation',
        entityId: input.reservationId,
        details: {
          deposit_amount: input.depositAmount,
          payment_method: input.paymentMethod || 'not_specified',
          payment_date: input.paymentDate || new Date().toISOString(),
          notes: input.notes,
          studio_name: reservation.studios?.name,
          competition_name: reservation.competitions?.name,
        },
      });

      return {
        reservation: updatedReservation,
        message: `Deposit of $${input.depositAmount.toFixed(2)} recorded successfully`,
      };
    }),

  /**
   * Create a new studio with a pre-approved reservation
   * Allows CDs to quickly onboard studios with confirmed spots and deposits
   */
  createStudioWithReservation: protectedProcedure
    .input(
      z.object({
        studioName: z.string().min(1),
        contactName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        competitionId: z.string().uuid(),
        preApprovedSpaces: z.number().int().min(1),
        depositAmount: z.number().min(0).optional(),
        comments: z.string().optional(), // CD comments to include in invitation email
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check user role - only competition directors and super admins
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: ctx.userId },
        select: { role: true },
      });

      if (!userProfile || (userProfile.role !== 'competition_director' && userProfile.role !== 'super_admin')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can create studios with reservations',
        });
      }

      // Get competition info for validation
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        select: {
          id: true,
          name: true,
          year: true,
          tenant_id: true,
        },
      });

      if (!competition) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition not found',
        });
      }

      // Verify tenant isolation
      if (competition.tenant_id !== ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Competition not found',
        });
      }

      // Check if studio email already exists for this tenant
      const existingStudio = await prisma.studios.findFirst({
        where: {
          tenant_id: ctx.tenantId,
          contact_email: input.email,
        },
      });

      if (existingStudio) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A studio with this email already exists',
        });
      }

      // Atomic transaction: Create studio, reservation, invitation
      const result = await prisma.$transaction(async (tx) => {
        // 1. Generate UNIQUE studio code (5 chars: 3 from name + 2 random)
        // Check against existing codes to prevent collisions
        let studioCode = '';
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          const prefix = input.studioName.replace(/[^A-Z]/g, '').substring(0, 3).toUpperCase();
          const random = Math.random().toString(36).substring(2, 4).toUpperCase();
          const candidateCode = `${prefix}${random}`;

          // Check if code already exists for this tenant
          const existingCode = await tx.studios.findFirst({
            where: {
              tenant_id: ctx.tenantId!,
              code: candidateCode,
            },
            select: { id: true },
          });

          if (!existingCode) {
            studioCode = candidateCode;
            break;
          }

          attempts++;
        }

        if (!studioCode) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate unique studio code after 10 attempts',
          });
        }

        // Create studio record (unclaimed status)
        const studio = await tx.studios.create({
          data: {
            tenant_id: ctx.tenantId!,
            name: input.studioName,
            contact_name: input.contactName,
            contact_email: input.email,
            contact_phone: input.phone || null,
            code: studioCode,
            public_code: studioCode,
            email: input.email, // Set email for invitation sending
            internal_notes: input.comments || null, // Store CD comments for invitation
            status: 'approved', // Pre-approved status (will be 'active' after claiming)
          },
        });

        // Create reservation with pre-approved status
        const reservation = await tx.reservations.create({
          data: {
            tenant_id: ctx.tenantId!,
            studio_id: studio.id,
            competition_id: input.competitionId,
            spaces_requested: input.preApprovedSpaces,
            spaces_confirmed: input.preApprovedSpaces,
            status: 'approved',
            approved_at: new Date(),
            approved_by: ctx.userId,
            deposit_amount: input.depositAmount || 0,
            deposit_paid_at: input.depositAmount && input.depositAmount > 0 ? new Date() : null,
            deposit_confirmed_by: input.depositAmount && input.depositAmount > 0 ? ctx.userId : null,
          },
        });

        // Reserve capacity directly (avoid nested transaction with capacityService)
        await tx.competitions.update({
          where: { id: input.competitionId },
          data: {
            available_reservation_tokens: {
              decrement: input.preApprovedSpaces,
            },
          },
        });

        // Log capacity change
        await tx.capacity_ledger.create({
          data: {
            tenant_id: ctx.tenantId!,
            competition_id: input.competitionId,
            reservation_id: reservation.id,
            change_amount: -input.preApprovedSpaces, // Negative = capacity reserved/consumed
            reason: 'cd_adjustment_increase',
            created_by: ctx.userId!,
          },
        });

        return { studio, reservation };
      });

      // 4. Log activity AFTER transaction completes (avoid nested transaction conflict)
      await logActivity({
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        action: 'studio_created_with_reservation',
        entityType: 'studio',
        entityId: result.studio.id,
        details: {
          studio_name: input.studioName,
          contact_email: input.email,
          competition_name: competition.name,
          pre_approved_spaces: input.preApprovedSpaces,
          deposit_amount: input.depositAmount || 0,
          reservation_id: result.reservation.id,
          has_comments: !!input.comments,
          comments: input.comments || null,
        },
      }).catch((err) => {
        // Don't fail the entire operation if activity logging fails
        console.error('Failed to log studio creation activity:', err);
      });

      // 5. Send invitation email AFTER transaction completes
      let invitationSent = false;
      try {
        // Get tenant info for email
        const tenant = await prisma.tenants.findUnique({
          where: { id: ctx.tenantId! },
          select: { name: true, subdomain: true },
        });

        if (!tenant) {
          throw new Error('Tenant not found');
        }

        const claimUrl = `https://${tenant.subdomain}.compsync.net/claim?code=${result.studio.public_code}`;

        // Build email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim Your ${tenant.name} Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🎉 You're Pre-Approved!
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${input.studioName}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! You've been pre-approved for <strong>${tenant.name}</strong> competitions.
              </p>

              ${
                input.comments
                  ? `
              <!-- CD Personal Message -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Personal Message from Competition Director
                    </p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
${input.comments}
                    </p>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }

              <!-- Reservation Details Box -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;">Your Reservation:</h2>
                    <div style="margin-bottom: 10px; padding-left: 10px; border-left: 3px solid #667eea;">
                      <strong style="color: #374151;">${competition.name}</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">
                        ${input.preApprovedSpaces} entries${input.depositAmount ? ` • $${input.depositAmount} deposit` : ''}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>Your Studio Code:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #667eea; font-weight: bold;">${
                  result.studio.public_code
                }</code>
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${claimUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                      Claim Your Account →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Plaintext Fallback -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; color: #92400e; font-size: 13px; font-weight: 600;">
                      Don't see the button above?
                    </p>
                    <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.6;">
                      Copy and paste this link into your browser:
                    </p>
                    <p style="margin: 8px 0 0; word-break: break-all;">
                      <a href="${claimUrl}" style="color: #2563eb; text-decoration: underline; font-size: 13px;">${claimUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Once you claim your account, you'll be able to:
              </p>
              <ul style="margin: 10px 0; padding-left: 25px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Enter your studio contact details</li>
                <li>Add your dancers to the roster</li>
                <li>View your approved reservations and competition schedule</li>
              </ul>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Questions? Contact us at <a href="mailto:techsupport@compsync.net" style="color: #667eea; text-decoration: none; font-weight: 600;">techsupport@compsync.net</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                — ${tenant.name} Team
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 11px;">
                This is an automated invitation. For support, email techsupport@compsync.net
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        const emailSubject = `Claim Your ${tenant.name} Account - ${input.studioName}`;

        await sendEmail({
          to: input.email,
          subject: emailSubject,
          html: emailHtml,
        });

        // Mark invitation as sent
        await prisma.studios.update({
          where: { id: result.studio.id },
          data: { invited_at: new Date() },
        });

        // Log email send to database
        await prisma.email_logs.create({
          data: {
            template_type: 'studio_invitation',
            recipient_email: input.email,
            subject: emailSubject,
            studio_id: result.studio.id,
            competition_id: input.competitionId,
            success: true,
            tenant_id: ctx.tenantId!,
            sent_at: new Date(),
          },
        });

        invitationSent = true;
        logger.info('Studio invitation sent automatically', {
          studioId: result.studio.id,
          studioName: input.studioName,
          email: input.email,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Log failed email to database
        try {
          await prisma.email_logs.create({
            data: {
              template_type: 'studio_invitation',
              recipient_email: input.email,
              subject: `Claim Your ${competition.name} Account - ${input.studioName}`,
              studio_id: result.studio.id,
              competition_id: input.competitionId,
              success: false,
              error_message: errorMessage,
              tenant_id: ctx.tenantId!,
              sent_at: new Date(),
            },
          });
        } catch (logError) {
          logger.error('Failed to log email error', { logError });
        }

        logger.error('Failed to send studio invitation automatically', {
          error: error instanceof Error ? error : new Error(String(error)),
          studioId: result.studio.id,
          studioName: input.studioName,
        });
        // Don't fail the entire operation if email fails - studio creation succeeded
      }

      return {
        studio: result.studio,
        reservation: result.reservation,
        message: invitationSent
          ? `Studio "${input.studioName}" created with ${input.preApprovedSpaces} pre-approved spaces. Invitation email sent to ${input.email}.`
          : `Studio "${input.studioName}" created with ${input.preApprovedSpaces} pre-approved spaces. Warning: Invitation email failed to send - please resend from Studio Invitations page.`,
      };
    }),

  // Reopen a summarized reservation to allow SD to make changes
  reopenSummary: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        sendEmail: z.boolean().default(true), // CD can optionally skip email notification
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only CDs and Super Admins can reopen summaries
      if (isStudioDirector(ctx.userRole)) {
        throw new Error('Studio directors cannot reopen summaries');
      }

      // Get reservation with invoice, studio, and competition info
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          invoices: {
            where: {
              status: { in: ['DRAFT', 'SENT', 'PENDING', 'PAID'] },
            },
          },
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
              public_code: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
              tenant_id: true,
            },
          },
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Guard: Only allow reopening from 'summarized' or 'invoiced' status
      guardReservationStatus(
        reservation.status as 'pending' | 'approved' | 'rejected' | 'summarized' | 'invoiced' | 'closed',
        ['summarized', 'invoiced', 'closed'],
        'reopen summary'
      );

      // Void any existing invoices
      if (reservation.invoices && reservation.invoices.length > 0) {
        await prisma.invoices.updateMany({
          where: {
            reservation_id: input.reservationId,
            status: { in: ['DRAFT', 'SENT', 'PENDING'] },
          },
          data: {
            status: 'VOID',
            updated_at: new Date(),
          },
        });
      }

      // Reset all entries from 'submitted' back to 'draft' so SD can edit them
      await prisma.competition_entries.updateMany({
        where: {
          reservation_id: input.reservationId,
          status: 'submitted',
        },
        data: {
          status: 'draft',
          updated_at: new Date(),
        },
      });

      // Delete existing summary so SD can resubmit
      await prisma.summaries.deleteMany({
        where: {
          reservation_id: input.reservationId,
        },
      });

      // Update reservation status back to approved and reopen it
      const updated = await prisma.reservations.update({
        where: { id: input.reservationId },
        data: {
          status: 'approved',
          is_closed: false,
          updated_at: new Date(),
        },
        include: {
          studios: {
            select: {
              name: true,
            },
          },
        },
      });

      logger.info('Summary reopened by CD', {
        reservationId: input.reservationId,
        studioName: updated.studios?.name,
        userId: ctx.userId,
        invoicesVoided: reservation.invoices?.length || 0,
        sendEmail: input.sendEmail,
      });

      // Send email notification to studio (optional - CD can skip)
      let emailSent = false;
      if (input.sendEmail && reservation.studios?.email && reservation.competitions) {
        try {
          // Get tenant info for branding
          const tenant = await prisma.tenants.findUnique({
            where: { id: reservation.competitions.tenant_id },
            select: { name: true, branding: true },
          });

          const branding = tenant?.branding as { primaryColor?: string; secondaryColor?: string } | null;
          const portalUrl = await getTenantPortalUrl(
            reservation.competitions.tenant_id,
            '/dashboard/entries'
          );

          const emailData: SummaryReopenedData = {
            studioName: reservation.studios.name,
            competitionName: reservation.competitions.name,
            competitionYear: reservation.competitions.year || new Date().getFullYear(),
            portalUrl,
            tenantBranding: branding || undefined,
          };

          const html = await renderSummaryReopened(emailData);
          await sendEmail({
            to: reservation.studios.email,
            subject: `Action Required: Summary Reopened - ${reservation.competitions.name}`,
            html,
            templateType: 'summary-reopened',
            studioId: reservation.studios.id,
            competitionId: reservation.competitions.id,
          });
          emailSent = true;
        } catch (emailError) {
          logger.error('Failed to send summary reopened email', {
            reservationId: input.reservationId,
            studioEmail: reservation.studios.email,
            error: emailError instanceof Error ? emailError : new Error(String(emailError)),
          });
          // Don't fail the operation if email fails
        }
      }

      return {
        success: true,
        message: `Summary reopened. ${reservation.invoices?.length || 0} invoice(s) voided. Studio can now edit entries.${emailSent ? ' Notification sent.' : ''}`,
      };
    }),

  // Request additional spaces from Competition Director
  requestAdditionalSpaces: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        additionalSpaces: z.number().int().min(1),
        justification: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify reservation exists and belongs to user's studio
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
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

      // Get Competition Director user for this tenant
      const cdUser = await prisma.user_profiles.findFirst({
        where: {
          tenant_id: ctx.tenantId,
          role: 'competition_director',
        },
      });

      if (!cdUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Competition Director not found for this tenant',
        });
      }

      // Store the pending space request on the reservation
      await prisma.reservations.update({
        where: { id: input.reservationId },
        data: {
          pending_additional_spaces: input.additionalSpaces,
          pending_spaces_justification: input.justification || null,
          pending_spaces_requested_at: new Date(),
          pending_spaces_requested_by: ctx.userId,
        },
      });

      // Log activity FIRST (before email, so it always runs even if email fails)
      await logActivity({
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        action: 'space_request',
        entityType: 'reservation',
        entityId: input.reservationId,
        entityName: reservation.studios?.name,
        details: {
          currentSpaces: reservation.spaces_confirmed,
          additionalSpaces: input.additionalSpaces,
          justification: input.justification,
        },
      });

      // Send styled email to CD (wrapped in try-catch so email failure doesn't break the mutation)
      let emailSent = false;
      try {
        const cdEmail = await getUserEmail(cdUser.id);
        if (cdEmail) {
          const portalUrl = await getTenantPortalUrl(
            ctx.tenantId!,
            `/dashboard/reservations?expand=${input.reservationId}`
          );

          // Get tenant branding for styled email
          const tenant = await prisma.tenants.findUnique({
            where: { id: ctx.tenantId! },
            select: { branding: true },
          });
          const branding = tenant?.branding as { primaryColor?: string; secondaryColor?: string } | null;

          const emailData: SpaceRequestNotificationData = {
            studioName: reservation.studios?.name || 'Unknown Studio',
            competitionName: reservation.competitions?.name || 'Unknown Competition',
            competitionYear: reservation.competitions?.year || new Date().getFullYear(),
            currentSpaces: reservation.spaces_confirmed || 0,
            additionalSpaces: input.additionalSpaces,
            newTotal: (reservation.spaces_confirmed || 0) + input.additionalSpaces,
            justification: input.justification,
            portalUrl,
            tenantBranding: branding || undefined,
          };

          const html = await renderSpaceRequestNotification(emailData);

          await sendEmail({
            to: cdEmail,
            subject: `Space Request from ${reservation.studios?.name} - +${input.additionalSpaces} spaces`,
            html,
          });
          emailSent = true;
        }
      } catch (emailError) {
        // Log error but don't fail the mutation - the request was still recorded
        console.error('Failed to send space request email notification:', emailError);
      }

      return {
        success: true,
        message: 'Your request has been sent to the Competition Director. You will be notified once it is reviewed.',
        emailSent,
      };
    }),

  // CD/SA approves a pending space request
  approveSpaceRequest: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only CD/SA can approve space requests
      if (isStudioDirector(ctx.userRole)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can approve space requests',
        });
      }

      // Get reservation with pending request data
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
              owner_id: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
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

      // Check there's a pending request
      if (!reservation.pending_additional_spaces) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No pending space request to approve',
        });
      }

      const additionalSpaces = reservation.pending_additional_spaces;
      const currentSpaces = reservation.spaces_confirmed || 0;
      const newTotalSpaces = currentSpaces + additionalSpaces;

      // Use capacityService to reserve additional capacity
      const capacityResult = await capacityService.reserve(
        reservation.competition_id,
        additionalSpaces,
        input.reservationId,
        ctx.userId!,
        'space_request_approved'
      );

      // Update reservation: increase spaces_confirmed and clear pending fields
      await prisma.reservations.update({
        where: { id: input.reservationId },
        data: {
          spaces_confirmed: newTotalSpaces,
          pending_additional_spaces: null,
          pending_spaces_justification: null,
          pending_spaces_requested_at: null,
          pending_spaces_requested_by: null,
          updated_at: new Date(),
        },
      });

      // Log activity
      await logActivity({
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        action: 'space_request_approved',
        entityType: 'reservation',
        entityId: input.reservationId,
        entityName: reservation.studios?.name,
        details: {
          previousSpaces: currentSpaces,
          additionalSpaces,
          newTotalSpaces,
          competitionName: reservation.competitions?.name,
        },
      });

      // Send notification email to Studio Director
      const studioOwnerId = reservation.studios?.owner_id;
      if (studioOwnerId) {
        const sdEmail = await getUserEmail(studioOwnerId);
        if (sdEmail) {
          const portalUrl = await getTenantPortalUrl(
            ctx.tenantId!,
            `/dashboard/entries`
          );
          await sendEmail({
            to: sdEmail,
            subject: `Space Request Approved - ${reservation.competitions?.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 24px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Space Request Approved</h1>
                </div>
                <div style="padding: 24px; background: #f9fafb;">
                  <p style="color: #374151; font-size: 16px;">Great news! Your request for additional spaces has been approved.</p>
                  <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 8px 0; color: #374151;"><strong>Studio:</strong> ${reservation.studios?.name}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Competition:</strong> ${reservation.competitions?.name} (${reservation.competitions?.year})</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Previous Spaces:</strong> ${currentSpaces}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Additional Approved:</strong> ${additionalSpaces}</p>
                    <p style="margin: 8px 0; color: #10b981; font-weight: bold;"><strong>New Total:</strong> ${newTotalSpaces} spaces</p>
                  </div>
                  <p style="color: #374151; font-size: 16px;">You can now create additional entries up to your new allocation.</p>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${portalUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Manage Your Entries</a>
                  </div>
                </div>
                <div style="padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
                  <p>This is an automated notification from CompSync.</p>
                </div>
              </div>
            `,
          });
        }
      }

      return {
        success: true,
        message: `Approved ${additionalSpaces} additional spaces. New total: ${newTotalSpaces}`,
        previousSpaces: currentSpaces,
        newTotalSpaces,
        capacityWarning: capacityResult.exceededBy > 0
          ? `Warning: Capacity exceeded by ${capacityResult.exceededBy} spaces`
          : undefined,
      };
    }),

  // CD/SA denies a pending space request
  denySpaceRequest: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only CD/SA can deny space requests
      if (isStudioDirector(ctx.userRole)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can deny space requests',
        });
      }

      // Get reservation with pending request data
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: {
            select: {
              id: true,
              name: true,
              email: true,
              owner_id: true,
            },
          },
          competitions: {
            select: {
              id: true,
              name: true,
              year: true,
            },
          },
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

      // Check there's a pending request
      if (!reservation.pending_additional_spaces) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No pending space request to deny',
        });
      }

      const additionalSpaces = reservation.pending_additional_spaces;
      const justification = reservation.pending_spaces_justification;

      // Clear pending fields (no capacity changes needed for denial)
      await prisma.reservations.update({
        where: { id: input.reservationId },
        data: {
          pending_additional_spaces: null,
          pending_spaces_justification: null,
          pending_spaces_requested_at: null,
          pending_spaces_requested_by: null,
          updated_at: new Date(),
        },
      });

      // Log activity
      await logActivity({
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        action: 'space_request_denied',
        entityType: 'reservation',
        entityId: input.reservationId,
        entityName: reservation.studios?.name,
        details: {
          requestedSpaces: additionalSpaces,
          justification,
          denialReason: input.reason,
          competitionName: reservation.competitions?.name,
        },
      });

      // Send notification email to Studio Director
      const studioOwnerId = reservation.studios?.owner_id;
      if (studioOwnerId) {
        const sdEmail = await getUserEmail(studioOwnerId);
        if (sdEmail) {
          const portalUrl = await getTenantPortalUrl(
            ctx.tenantId!,
            `/dashboard/entries`
          );
          await sendEmail({
            to: sdEmail,
            subject: `Space Request Update - ${reservation.competitions?.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%); padding: 24px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Space Request Not Approved</h1>
                </div>
                <div style="padding: 24px; background: #f9fafb;">
                  <p style="color: #374151; font-size: 16px;">We regret to inform you that your request for additional spaces could not be approved at this time.</p>
                  <div style="background: white; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 8px 0; color: #374151;"><strong>Studio:</strong> ${reservation.studios?.name}</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Competition:</strong> ${reservation.competitions?.name} (${reservation.competitions?.year})</p>
                    <p style="margin: 8px 0; color: #374151;"><strong>Requested:</strong> ${additionalSpaces} additional spaces</p>
                    ${input.reason ? `<p style="margin: 8px 0; color: #6b7280;"><strong>Reason:</strong> ${input.reason}</p>` : ''}
                  </div>
                  <p style="color: #374151; font-size: 16px;">If you have questions, please contact the Competition Director directly.</p>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${portalUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Your Entries</a>
                  </div>
                </div>
                <div style="padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
                  <p>This is an automated notification from CompSync.</p>
                </div>
              </div>
            `,
          });
        }
      }

      return {
        success: true,
        message: 'Space request has been denied',
      };
    }),

  // Move reservation to a different competition
  // CD or SA only - handles capacity adjustments and entry updates
  moveToCompetition: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        targetCompetitionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only CDs and Super Admins can move reservations
      if (isStudioDirector(ctx.userRole)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can move reservations between competitions',
        });
      }

      // Get reservation details
      const reservation = await prisma.reservations.findUnique({
        where: { id: input.reservationId },
        include: {
          studios: { select: { name: true, email: true, owner_id: true } },
          competitions: { select: { id: true, name: true, tenant_id: true } },
          competition_entries: { select: { id: true } },
          invoices: { select: { id: true, status: true } },
        },
      });

      if (!reservation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Reservation not found' });
      }

      // Verify tenant access (CDs can only move within their tenant)
      if (ctx.userRole === 'competition_director' && reservation.competitions.tenant_id !== ctx.tenantId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      // Get target competition details
      const targetCompetition = await prisma.competitions.findUnique({
        where: { id: input.targetCompetitionId },
        select: {
          id: true,
          name: true,
          year: true,
          tenant_id: true,
          available_reservation_tokens: true,
        },
      });

      if (!targetCompetition) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Target competition not found' });
      }

      // Verify target competition is in same tenant
      if (targetCompetition.tenant_id !== reservation.competitions.tenant_id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot move reservation to a competition in a different tenant',
        });
      }

      // Check if same competition
      if (reservation.competition_id === input.targetCompetitionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Reservation is already in this competition',
        });
      }

      // Get spaces needed for capacity tracking
      const spacesNeeded = reservation.spaces_confirmed || reservation.spaces_requested;

      // Execute move in transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Release capacity from old competition
        await tx.competitions.update({
          where: { id: reservation.competition_id },
          data: {
            available_reservation_tokens: { increment: spacesNeeded },
          },
        });

        // 2. Reserve capacity in new competition
        await tx.competitions.update({
          where: { id: input.targetCompetitionId },
          data: {
            available_reservation_tokens: { decrement: spacesNeeded },
          },
        });

        // 3. Update reservation
        await tx.reservations.update({
          where: { id: input.reservationId },
          data: {
            competition_id: input.targetCompetitionId,
          },
        });

        // 4. Update all entries under this reservation
        if (reservation.competition_entries.length > 0) {
          await tx.competition_entries.updateMany({
            where: { reservation_id: input.reservationId },
            data: { competition_id: input.targetCompetitionId },
          });
        }

        // 5. Update invoice if exists (any status - DRAFT, SENT, PAID)
        if (reservation.invoices.length > 0) {
          await tx.invoices.updateMany({
            where: { reservation_id: input.reservationId },
            data: { competition_id: input.targetCompetitionId },
          });
        }

        // 6. Log capacity adjustments in ledger
        // Release from old competition
        await tx.capacity_ledger.create({
          data: {
            tenant_id: reservation.competitions.tenant_id,
            competition_id: reservation.competition_id,
            change_amount: spacesNeeded,
            reason: `Move to ${targetCompetition.name.substring(0, 30)}: +${spacesNeeded}`,
            reservation_id: input.reservationId,
            created_by: ctx.userId!,
          },
        });

        // Reserve in new competition
        await tx.capacity_ledger.create({
          data: {
            tenant_id: targetCompetition.tenant_id,
            competition_id: input.targetCompetitionId,
            change_amount: -spacesNeeded,
            reason: `Move from ${reservation.competitions.name.substring(0, 27)}: -${spacesNeeded}`,
            reservation_id: input.reservationId,
            created_by: ctx.userId!,
          },
        });

        return {
          oldCompetition: reservation.competitions.name,
          newCompetition: targetCompetition.name,
          entriesUpdated: reservation.competition_entries.length,
        };
      });

      // Log activity
      await logActivity({
        userId: ctx.userId!,
        tenantId: ctx.tenantId!,
        action: 'move_reservation',
        entityType: 'reservation',
        entityId: input.reservationId,
        entityName: reservation.studios?.name,
        details: {
          from_competition: result.oldCompetition,
          to_competition: result.newCompetition,
          spaces: spacesNeeded,
          entries_updated: result.entriesUpdated,
        },
      });

      // Send notification email to studio if account is claimed
      if (reservation.studios?.owner_id && reservation.studios?.email) {
        try {
          const emailEnabled = await isEmailEnabled(
            reservation.studios.owner_id,
            'reservation_updated'
          );

          if (emailEnabled) {
            // Get tenant branding
            const tenant = await prisma.tenants.findUnique({
              where: { id: reservation.competitions.tenant_id },
              select: {
                name: true,
                branding: true,
              },
            });

            const branding = tenant?.branding as { primaryColor?: string; secondaryColor?: string; logo?: string | null } | null;
            const tenantBranding = {
              primaryColor: branding?.primaryColor || '#8b5cf6',
              secondaryColor: branding?.secondaryColor || '#ec4899',
              logo: branding?.logo || null,
              tenantName: tenant?.name || 'Competition Portal',
            };

            // Get portal URL for this tenant
            const portalUrl = await getTenantPortalUrl(reservation.competitions.tenant_id, '/dashboard/reservations');

            const emailData: ReservationMovedData = {
              studioName: reservation.studios.name,
              oldCompetitionName: result.oldCompetition,
              newCompetitionName: result.newCompetition,
              newCompetitionYear: targetCompetition.year,
              spacesConfirmed: spacesNeeded,
              entriesUpdated: result.entriesUpdated,
              portalUrl,
              tenantBranding,
            };

            const html = await renderReservationMoved(emailData);
            const subject = getEmailSubject('reservation-moved', {
              studioName: reservation.studios.name,
              oldCompetitionName: result.oldCompetition,
              newCompetitionName: result.newCompetition,
            });

            await sendEmail({
              to: reservation.studios.email,
              subject,
              html,
              templateType: 'reservation-moved',
              studioId: reservation.studio_id,
              competitionId: input.targetCompetitionId,
            });
          }
        } catch (error) {
          logger.error('Failed to send competition move notification email', {
            error: error instanceof Error ? error : new Error(String(error)),
            reservationId: input.reservationId,
          });
          // Don't fail the operation if email fails
        }
      }

      return {
        success: true,
        message: `Reservation moved from "${result.oldCompetition}" to "${result.newCompetition}". ${result.entriesUpdated} entries updated.`,
        oldCompetition: result.oldCompetition,
        newCompetition: result.newCompetition,
        entriesUpdated: result.entriesUpdated,
      };
    }),
});
