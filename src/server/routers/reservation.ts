import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { isStudioDirector } from '@/lib/permissions';
import { isSuperAdmin } from '@/lib/auth-utils';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getTenantPortalUrl } from '@/lib/tenant-url';
import {
  renderReservationApproved,
  renderReservationRejected,
  renderReservationSubmitted,
  renderPaymentConfirmed,
  renderInvoiceDelivery,
  getEmailSubject,
  type ReservationApprovedData,
  type ReservationRejectedData,
  type ReservationSubmittedData,
  type PaymentConfirmedData,
  type InvoiceDeliveryData,
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

      // Tenant isolation (required for all non-super-admins)
      if (!isSuperAdmin(ctx.userRole) && ctx.tenantId) {
        where.tenant_id = ctx.tenantId;
      }

      // Studio directors can only see their own studio's reservations
      if (isStudioDirector(ctx.userRole) && ctx.studioId) {
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
              },
            },
            competition_locations: {
              select: {
                id: true,
                name: true,
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
          take: limit,
          skip: offset,
        }),
        prisma.reservations.count({ where }),
        prisma.competitions.findMany({
          where: {
            ...(ctx.tenantId ? { tenant_id: ctx.tenantId } : {}),
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
          users: {
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

      // Check competition capacity
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competition_id },
        select: {
          id: true,
          name: true,
          venue_capacity: true,
          _count: {
            select: {
              competition_entries: true,
            },
          },
        },
      });

      if (!competition) {
        throw new Error('Competition not found');
      }

      const currentEntries = competition._count.competition_entries;
      const capacity = competition.venue_capacity || 0;

      if (capacity > 0 && currentEntries + input.spaces_requested > capacity) {
        const available = capacity - currentEntries;
        throw new Error(
          `Not enough space available. Requested: ${input.spaces_requested}, Available: ${available}`
        );
      }

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

      guardReservationStatus(
        existingReservation.status as 'pending' | 'approved' | 'rejected',
        ['pending'],
        'approve reservation'
      );

      // Reserve capacity atomically (includes status update to prevent double-processing)
      // Matches Phase 1 spec lines 442-499 (approval process)
      const spacesConfirmed = input.spacesConfirmed || 0;
      if (spacesConfirmed > 0) {
        try {
          const competitionId = (await prisma.reservations.findUnique({
            where: { id: reservationId },
            select: { competition_id: true }
          }))!.competition_id;

          // ⚡ ATOMIC: CapacityService.reserve() now handles both capacity + status update
          await capacityService.reserve(
            competitionId,
            spacesConfirmed,
            reservationId,
            ctx.userId
          );
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
              // Get tenant_id for URL generation
              const reservationTenant = await prisma.reservations.findUnique({
                where: { id: reservation.id },
                select: { tenant_id: true },
              });

              const emailData: ReservationApprovedData = {
                studioName: reservation.studios.name,
                competitionName: reservation.competitions?.name || 'Competition',
                competitionYear: reservation.competitions?.year || new Date().getFullYear(),
                spacesConfirmed: reservation.spaces_confirmed || 0,
                portalUrl: await getTenantPortalUrl(reservationTenant!.tenant_id, '/dashboard/entries'),
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

      return reservation;
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
              // Get tenant_id for URL generation
              const reservationTenant = await prisma.reservations.findUnique({
                where: { id: reservation.id },
                select: { tenant_id: true },
              });

              const emailData: ReservationRejectedData = {
                studioName: reservation.studios.name,
                competitionName: reservation.competitions?.name || 'Competition',
                competitionYear: reservation.competitions?.year || new Date().getFullYear(),
                reason: input.reason,
                portalUrl: await getTenantPortalUrl(reservationTenant!.tenant_id, '/dashboard/reservations'),
                contactEmail: reservation.competitions?.contact_email || process.env.EMAIL_FROM || 'info@glowdance.com',
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

      // Verify competition exists and has capacity
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

      const availableTokens = competition.available_reservation_tokens ?? 600;
      if (input.spacesAllocated > availableTokens) {
        throw new Error(`Insufficient capacity. Available: ${availableTokens}, Requested: ${input.spacesAllocated}`);
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
});
