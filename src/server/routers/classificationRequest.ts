/**
 * Classification Exception Request Router
 * Spec: docs/specs/CLASSIFICATION_EXCEPTION_APPROVAL_SPEC.md
 *
 * Handles SD requests for classification exceptions and CD approval flow
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const classificationRequestRouter = router({
  /**
   * Create Classification Exception Request
   * Spec lines 696-767
   *
   * Called when SD wants different classification than auto-calculated
   * - Creates request record
   * - Updates entry status to 'pending_classification_approval'
   * - Sets entry classification to requested value
   * - Sends email to CD
   */
  create: protectedProcedure
    .input(z.object({
      entryId: z.string().uuid(),
      requestedClassificationId: z.string().uuid(),
      sdJustification: z.string().min(10, 'Justification must be at least 10 characters'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is Studio Director
      if (ctx.userRole !== 'studio_director') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Studio Directors can create classification requests',
        });
      }

      // Get entry with all relationships
      const entry = await prisma.competition_entries.findUnique({
        where: { id: input.entryId },
        include: {
          reservations: {
            include: {
              competitions: true,
              studios: true,
            },
          },
          classifications: true,
        },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Entry not found',
        });
      }

      // Verify entry belongs to user's studio
      if (!entry.reservations || entry.reservations.studio_id !== ctx.studioId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only create requests for your studio\'s entries',
        });
      }

      // Verify entry isn't already pending approval
      if (entry.status === 'pending_classification_approval') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This entry already has a pending classification request',
        });
      }

      // Create exception request
      const request = await prisma.classification_exception_requests.create({
        data: {
          entry_id: input.entryId,
          reservation_id: entry.reservation_id || '',
          competition_id: entry.reservations.competition_id,
          studio_id: entry.reservations.studio_id,
          tenant_id: ctx.tenantId || '',
          auto_calculated_classification_id: entry.classification_id || '',
          requested_classification_id: input.requestedClassificationId,
          sd_justification: input.sdJustification,
          created_by: ctx.userId,
          status: 'pending',
        },
      });

      // Update entry status and classification
      await prisma.competition_entries.update({
        where: { id: input.entryId },
        data: {
          status: 'pending_classification_approval',
          classification_id: input.requestedClassificationId, // Set to requested
        },
      });

      // Log activity (only if tenant_id exists)
      if (ctx.tenantId) {
        await prisma.activity_logs.create({
          data: {
            user_id: ctx.userId,
            studio_id: ctx.studioId || undefined,
            tenant_id: ctx.tenantId,
            action: 'classification.request_exception',
            entity_type: 'classification_request',
            entity_id: request.id,
            details: {
              entry_id: input.entryId,
              entry_title: entry.title,
              auto_calculated: entry.classifications?.name,
              requested_classification_id: input.requestedClassificationId,
            },
          },
        });
      }

      // TODO: Send email to CD (will implement in email integration phase)
      // await sendEmail({
      //   templateType: 'classification-exception-new-request',
      //   to: CD email,
      //   data: { ... }
      // });

      return request;
    }),

  /**
   * Get Classification Requests (For CD)
   * Spec lines 774-814
   *
   * Returns requests filtered by tenant, with optional studio and status filters
   */
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'resolved', 'all']).default('pending'),
      studioId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify user is CD or SA
      if (!['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can view classification requests',
        });
      }

      const where: any = {
        tenant_id: ctx.tenantId,
        ...(input.status !== 'all' && { status: input.status }),
        ...(input.studioId && { studio_id: input.studioId }),
      };

      const requests = await prisma.classification_exception_requests.findMany({
        where,
        include: {
          competition_entries: {
            include: {
              reservations: {
                include: {
                  competitions: true,
                  studios: true,
                },
              },
            },
          },
          user_profiles_classification_exception_requests_created_byTouser_profiles: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
          classifications_classification_exception_requests_auto_calculated_classification_idToclassifications: {
            select: {
              id: true,
              name: true,
            },
          },
          classifications_classification_exception_requests_requested_classification_idToclassifications: {
            select: {
              id: true,
              name: true,
            },
          },
          classifications_classification_exception_requests_approved_classification_idToclassifications: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return { requests };
    }),

  /**
   * Get Single Request (For Detail View)
   *
   * Returns full request details including all dancers in entry
   */
  getById: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const request = await prisma.classification_exception_requests.findUnique({
        where: { id: input.requestId },
        include: {
          competition_entries: {
            include: {
              reservations: {
                include: {
                  competitions: true,
                  studios: true,
                },
              },
              entry_participants: {
                include: {
                  dancers: {
                    include: {
                      classifications: true,
                    },
                  },
                },
                orderBy: { display_order: 'asc' },
              },
            },
          },
          user_profiles_classification_exception_requests_created_byTouser_profiles: true,
          user_profiles_classification_exception_requests_responded_byTouser_profiles: true,
          classifications_classification_exception_requests_auto_calculated_classification_idToclassifications: true,
          classifications_classification_exception_requests_requested_classification_idToclassifications: true,
          classifications_classification_exception_requests_approved_classification_idToclassifications: true,
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Request not found',
        });
      }

      // Verify access: CD/SA for tenant OR SD for their studio
      const hasAccess =
        ['competition_director', 'super_admin'].includes(ctx.userRole || '') && request.tenant_id === ctx.tenantId ||
        ctx.userRole === 'studio_director' && request.studio_id === ctx.studioId;

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this request',
        });
      }

      return request;
    }),

  /**
   * CD Makes Decision on Request
   * Spec lines 821-886
   *
   * CD either approves as requested OR sets different classification
   * - Updates request status
   * - Updates entry classification and status
   * - Sends email to SD
   */
  respond: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      decisionType: z.enum(['approved_as_requested', 'approved_different']),
      approvedClassificationId: z.string().uuid(),
      cdComments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is CD or SA
      if (!['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can respond to classification requests',
        });
      }

      // Get request
      const request = await prisma.classification_exception_requests.findUnique({
        where: { id: input.requestId },
        include: {
          competition_entries: true,
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Request not found',
        });
      }

      // Verify tenant match
      if (request.tenant_id !== ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only respond to requests in your tenant',
        });
      }

      // Verify request is still pending
      if (request.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This request has already been responded to',
        });
      }

      // Update request
      await prisma.classification_exception_requests.update({
        where: { id: input.requestId },
        data: {
          status: input.decisionType === 'approved_as_requested' ? 'approved' : 'resolved',
          cd_decision_type: input.decisionType,
          approved_classification_id: input.approvedClassificationId,
          cd_comments: input.cdComments,
          responded_at: new Date(),
          responded_by: ctx.userId,
        },
      });

      // Update entry - set classification and restore regular status
      await prisma.competition_entries.update({
        where: { id: request.entry_id },
        data: {
          classification_id: input.approvedClassificationId,
          status: 'draft', // Regular status
        },
      });

      // Log activity (only if tenant_id exists)
      if (ctx.tenantId) {
        await prisma.activity_logs.create({
          data: {
            user_id: ctx.userId,
            tenant_id: ctx.tenantId,
            action: `classification.${input.decisionType}`,
            entity_type: 'classification_request',
            entity_id: request.id,
            details: {
              entry_id: request.entry_id,
              approved_classification_id: input.approvedClassificationId,
            },
          },
        });
      }

      // TODO: Send email to SD (will implement in email integration phase)
      // const templateType = input.decisionType === 'approved_as_requested'
      //   ? 'classification-exception-approved'
      //   : 'classification-exception-resolved';
      // await sendEmail({ templateType, ... });

      return { success: true };
    }),

  /**
   * Get Request Count for Badge
   * Spec lines 893-914
   *
   * Returns count of pending and total requests for CD dashboard badge
   */
  getCount: protectedProcedure
    .query(async ({ ctx }) => {
      // Only return counts for CD or SA
      if (!['competition_director', 'super_admin'].includes(ctx.userRole || '') || !ctx.tenantId) {
        return { pending: 0, total: 0, resolved: 0 };
      }

      const [pending, total, resolved] = await Promise.all([
        prisma.classification_exception_requests.count({
          where: {
            tenant_id: ctx.tenantId,
            status: 'pending',
          },
        }),
        prisma.classification_exception_requests.count({
          where: { tenant_id: ctx.tenantId },
        }),
        prisma.classification_exception_requests.count({
          where: {
            tenant_id: ctx.tenantId,
            status: { in: ['approved', 'resolved'] },
          },
        }),
      ]);

      return { pending, total, resolved };
    }),

  /**
   * Cancel Request (SD deletes entry)
   * Spec: Edge Case 1 (lines 966-970)
   *
   * SD can delete pending request by deleting entry
   * CASCADE will automatically delete the request
   * This route is for explicit cancellation without entry deletion
   */
  cancel: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is Studio Director
      if (ctx.userRole !== 'studio_director') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Studio Directors can cancel requests',
        });
      }

      // Get request
      const request = await prisma.classification_exception_requests.findUnique({
        where: { id: input.requestId },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Request not found',
        });
      }

      // Verify studio match
      if (request.studio_id !== ctx.studioId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only cancel your own requests',
        });
      }

      // Verify request is still pending
      if (request.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You can only cancel pending requests',
        });
      }

      // Delete request (will also delete entry if CASCADE configured)
      await prisma.classification_exception_requests.delete({
        where: { id: input.requestId },
      });

      // Note: Entry deletion handled by cascade or separate mutation
      // No email sent to CD (silent cancellation per spec)

      return { success: true };
    }),
});
