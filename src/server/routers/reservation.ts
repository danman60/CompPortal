import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { isStudioDirector } from '@/lib/permissions';
import { sendEmail } from '@/lib/email';
import {
  renderReservationApproved,
  renderReservationRejected,
  renderPaymentConfirmed,
  getEmailSubject,
  type ReservationApprovedData,
  type ReservationRejectedData,
  type PaymentConfirmedData,
} from '@/lib/email-templates';

// Validation schema for reservation input
const reservationInputSchema = z.object({
  studio_id: z.string().uuid(),
  competition_id: z.string().uuid(),
  location_id: z.string().uuid().optional(),
  spaces_requested: z.number().int().min(1).max(1000),
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
        .optional()
    )
    .query(async ({ ctx, input = {} }) => {
      const { studioId, competitionId, status, paymentStatus, limit = 50, offset = 0 } = input;

      const where: any = {};

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
          select: {
            id: true,
            name: true,
            year: true,
            total_reservation_tokens: true,
            available_reservation_tokens: true,
            tokens_override_enabled: true,
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
        .optional()
    )
    .query(async ({ input = {} }) => {
      const where: any = {};

      if (input.competitionId) {
        where.competition_id = input.competitionId;
      }

      if (input.studioId) {
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

      const reservation = await prisma.reservations.create({
        data: {
          ...data,
          payment_due_date: payment_due_date ? new Date(payment_due_date) : undefined,
          deposit_amount: deposit_amount?.toString(),
          total_amount: total_amount?.toString(),
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
        id: z.string().uuid(),
        spacesConfirmed: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only competition directors and super admins can approve reservations
      if (isStudioDirector(ctx.userRole)) {
        throw new Error('Studio directors cannot approve reservations');
      }

      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          status: 'approved',
          spaces_confirmed: input.spacesConfirmed,
          approved_at: new Date(),
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
              entry_fee: true,
            },
          },
        },
      });

      // Auto-adjust competition capacity (Issue #16)
      const spacesConfirmed = reservation.spaces_confirmed || 0;
      await prisma.competitions.update({
        where: { id: reservation.competition_id },
        data: {
          available_reservation_tokens: {
            decrement: spacesConfirmed,
          },
        },
      });

      // Auto-generate invoice on approval
      const existingInvoice = await prisma.invoices.findFirst({
        where: {
          studio_id: reservation.studio_id,
          competition_id: reservation.competition_id,
          reservation_id: reservation.id,
        },
      });

      if (!existingInvoice && spacesConfirmed > 0) {
        const routinesFee = reservation.competitions?.entry_fee;

        if (!routinesFee || Number(routinesFee) <= 0) {
          console.error('Cannot create invoice: Invalid entry fee for competition', {
            competitionId: reservation.competition_id,
            entryFee: routinesFee,
          });
        } else {
          const subtotal = Number(routinesFee) * spacesConfirmed;

          await prisma.invoices.create({
            data: {
              studio_id: reservation.studio_id,
              competition_id: reservation.competition_id,
              reservation_id: reservation.id,
              line_items: [
                {
                  description: `Routine reservations (${spacesConfirmed} routines @ $${Number(routinesFee).toFixed(2)} each)`,
                  quantity: spacesConfirmed,
                  unit_price: Number(routinesFee),
                  total: subtotal,
                },
              ],
              subtotal: subtotal,
              total: subtotal,
              status: 'UNPAID',
            },
          });
        }
      }

      // Send approval email to studio
      if (reservation.studios?.email) {
        try {
          const emailData: ReservationApprovedData = {
            studioName: reservation.studios.name,
            competitionName: reservation.competitions?.name || 'Competition',
            competitionYear: reservation.competitions?.year || new Date().getFullYear(),
            spacesConfirmed: reservation.spaces_confirmed || 0,
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reservations`,
          };

          const html = await renderReservationApproved(emailData);
          const subject = getEmailSubject('reservation-approved', {
            competitionName: emailData.competitionName,
            competitionYear: emailData.competitionYear,
          });

          await sendEmail({
            to: reservation.studios.email,
            subject,
            html,
          });
        } catch (error) {
          console.error('Failed to send approval email:', error);
          // Don't throw - email failure shouldn't block the approval
        }
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

      // Send rejection email to studio
      if (reservation.studios?.email) {
        try {
          const emailData: ReservationRejectedData = {
            studioName: reservation.studios.name,
            competitionName: reservation.competitions?.name || 'Competition',
            competitionYear: reservation.competitions?.year || new Date().getFullYear(),
            reason: input.reason,
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reservations`,
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
          });
        } catch (error) {
          console.error('Failed to send rejection email:', error);
          // Don't throw - email failure shouldn't block the rejection
        }
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

      const reservation = await prisma.reservations.update({
        where: { id: input.id },
        data: {
          payment_status: input.paymentStatus,
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
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
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
