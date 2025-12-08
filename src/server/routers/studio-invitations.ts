import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

/**
 * Studio Invitations Router
 * Super Admin only - send account claiming invitations to pre-approved studios
 */
export const studioInvitationsRouter = router({
  /**
   * Get ALL studios with full status tracking
   * Super Admin only
   */
  getAllStudios: publicProcedure.query(async ({ ctx }) => {
    // Check if user is super_admin
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Super Admin can view studio invitations',
      });
    }

    const studios = await prisma.studios.findMany({
      where: {
        status: { in: ['approved', 'active'] },
      },
      select: {
        id: true,
        name: true,
        public_code: true,
        email: true,
        owner_id: true,
        invited_at: true,
        status: true,
        tenants: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
        reservations: {
          where: {
            status: { in: ['approved', 'adjusted', 'summarized'] },
          },
          select: {
            spaces_confirmed: true,
            deposit_amount: true,
            competitions: {
              select: {
                id: true,
                name: true,
                competition_start_date: true,
                competition_end_date: true,
              },
            },
          },
        },
      },
    });

    // Get owner profiles separately for claimed studios
    const ownerIds = studios.map(s => s.owner_id).filter((id): id is string => id !== null);
    const ownerProfiles = ownerIds.length > 0 ? await prisma.user_profiles.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, first_name: true, last_name: true },
    }) : [];
    const ownerProfileMap = new Map(ownerProfiles.map(p => [p.id, p]));

    // Map studios with full status tracking
    const studiosWithDetails = studios.map((studio) => {
      const totalSpaces = studio.reservations.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0);
      const totalDeposit = studio.reservations.reduce((sum, r) => sum + parseFloat(r.deposit_amount?.toString() || '0'), 0);

      // Get earliest event date for sorting
      const eventDates = studio.reservations
        .map((r) => r.competitions.competition_start_date)
        .filter((date): date is Date => date !== null);
      const earliestEvent = eventDates.length > 0 ? new Date(Math.min(...eventDates.map((d) => d.getTime()))) : null;

      // Determine statuses
      const isClaimed = studio.owner_id !== null;
      const userProfile = studio.owner_id ? ownerProfileMap.get(studio.owner_id) : null;
      const hasCompletedOnboarding = userProfile?.first_name !== null && userProfile?.first_name !== '';
      const wasInvited = studio.invited_at !== null;

      return {
        id: studio.id,
        name: studio.name,
        publicCode: studio.public_code,
        email: studio.email,
        tenantId: studio.tenants.id,
        tenantName: studio.tenants.name,
        tenantSubdomain: studio.tenants.subdomain,
        invitedAt: studio.invited_at,
        isClaimed,
        hasCompletedOnboarding,
        wasInvited,
        ownerName: hasCompletedOnboarding && userProfile
          ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
          : null,
        reservationCount: studio.reservations.length,
        events: studio.reservations.map((r) => ({
          competitionId: r.competitions.id,
          name: r.competitions.name,
          startDate: r.competitions.competition_start_date,
          endDate: r.competitions.competition_end_date,
          spaces: r.spaces_confirmed || 0,
          deposit: parseFloat(r.deposit_amount?.toString() || '0'),
        })),
        totalSpaces,
        totalDeposit,
        earliestEvent,
      };
    });

    return {
      studios: studiosWithDetails,
      count: studiosWithDetails.length,
      stats: {
        total: studiosWithDetails.length,
        unclaimed: studiosWithDetails.filter(s => !s.isClaimed).length,
        claimed: studiosWithDetails.filter(s => s.isClaimed).length,
        invited: studiosWithDetails.filter(s => s.wasInvited).length,
        onboardingComplete: studiosWithDetails.filter(s => s.hasCompletedOnboarding).length,
      },
    };
  }),

  /**
   * Get studios for Competition Director (tenant-scoped)
   * Competition Director or SA only
   */
  getStudiosForCD: publicProcedure.query(async ({ ctx }) => {
    // Check if user is competition_director or super_admin
    if (!['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Competition Directors can view studio invitations',
      });
    }

    // Filter by tenant_id
    if (!ctx.tenantId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tenant context required',
      });
    }

    const studios = await prisma.studios.findMany({
      where: {
        tenant_id: ctx.tenantId,
        status: { in: ['approved', 'active'] },
      },
      select: {
        id: true,
        name: true,
        public_code: true,
        email: true,
        owner_id: true,
        invited_at: true,
        status: true,
        reservations: {
          where: {
            status: { in: ['approved', 'adjusted', 'summarized'] },
          },
          select: {
            spaces_confirmed: true,
            deposit_amount: true,
            competitions: {
              select: {
                id: true,
                name: true,
                competition_start_date: true,
                competition_end_date: true,
              },
            },
          },
        },
      },
    });

    // Get owner profiles separately for claimed studios
    const ownerIds = studios.map(s => s.owner_id).filter((id): id is string => id !== null);
    const ownerProfiles = ownerIds.length > 0 ? await prisma.user_profiles.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, first_name: true, last_name: true },
    }) : [];
    const ownerProfileMap = new Map(ownerProfiles.map(p => [p.id, p]));

    // Map studios with full status tracking
    const studiosWithDetails = studios.map((studio) => {
      const totalSpaces = studio.reservations.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0);
      const totalDeposit = studio.reservations.reduce((sum, r) => sum + parseFloat(r.deposit_amount?.toString() || '0'), 0);

      // Get earliest event date for sorting
      const eventDates = studio.reservations
        .map((r) => r.competitions.competition_start_date)
        .filter((date): date is Date => date !== null);
      const earliestEvent = eventDates.length > 0 ? new Date(Math.min(...eventDates.map((d) => d.getTime()))) : null;

      // Determine statuses
      const isClaimed = studio.owner_id !== null;
      const userProfile = studio.owner_id ? ownerProfileMap.get(studio.owner_id) : null;
      const hasCompletedOnboarding = userProfile?.first_name !== null && userProfile?.first_name !== '';
      const wasInvited = studio.invited_at !== null;

      return {
        id: studio.id,
        name: studio.name,
        publicCode: studio.public_code,
        email: studio.email,
        invitedAt: studio.invited_at,
        isClaimed,
        hasCompletedOnboarding,
        wasInvited,
        ownerName: hasCompletedOnboarding && userProfile
          ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
          : null,
        reservationCount: studio.reservations.length,
        events: studio.reservations.map((r) => ({
          competitionId: r.competitions.id,
          name: r.competitions.name,
          startDate: r.competitions.competition_start_date,
          endDate: r.competitions.competition_end_date,
          spaces: r.spaces_confirmed || 0,
          deposit: parseFloat(r.deposit_amount?.toString() || '0'),
        })),
        totalSpaces,
        totalDeposit,
        earliestEvent,
      };
    });

    return {
      studios: studiosWithDetails,
      count: studiosWithDetails.length,
      stats: {
        total: studiosWithDetails.length,
        unclaimed: studiosWithDetails.filter(s => !s.isClaimed).length,
        claimed: studiosWithDetails.filter(s => s.isClaimed).length,
        invited: studiosWithDetails.filter(s => s.wasInvited).length,
        onboardingComplete: studiosWithDetails.filter(s => s.hasCompletedOnboarding).length,
      },
    };
  }),

  /**
   * Get list of unclaimed studios (owner_id = NULL)
   * Super Admin only
   * @deprecated Use getAllStudios instead
   */
  getUnclaimedStudios: publicProcedure.query(async ({ ctx }) => {
    // Check if user is super_admin
    if (ctx.userRole !== 'super_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Super Admin can view unclaimed studios',
      });
    }

    const studios = await prisma.studios.findMany({
      where: {
        owner_id: null,
        status: 'approved',
      },
      select: {
        id: true,
        name: true,
        public_code: true,
        email: true,
        invited_at: true,
        tenants: {
          select: {
            name: true,
            subdomain: true,
          },
        },
        reservations: {
          where: {
            status: { in: ['approved', 'adjusted'] },
          },
          select: {
            spaces_confirmed: true,
            deposit_amount: true,
            competitions: {
              select: {
                id: true,
                name: true,
                competition_start_date: true,
                competition_end_date: true,
              },
            },
          },
        },
      },
    });

    // Map studios with event details
    const studiosWithDetails = studios.map((studio) => {
      const totalSpaces = studio.reservations.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0);
      const totalDeposit = studio.reservations.reduce((sum, r) => sum + parseFloat(r.deposit_amount?.toString() || '0'), 0);

      // Get earliest event date for sorting
      const eventDates = studio.reservations
        .map((r) => r.competitions.competition_start_date)
        .filter((date): date is Date => date !== null);
      const earliestEvent = eventDates.length > 0 ? new Date(Math.min(...eventDates.map((d) => d.getTime()))) : null;

      return {
        id: studio.id,
        name: studio.name,
        publicCode: studio.public_code,
        email: studio.email,
        tenantName: studio.tenants.name,
        tenantSubdomain: studio.tenants.subdomain,
        invitedAt: studio.invited_at,
        reservationCount: studio.reservations.length,
        events: studio.reservations.map((r) => ({
          competitionId: r.competitions.id,
          name: r.competitions.name,
          startDate: r.competitions.competition_start_date,
          endDate: r.competitions.competition_end_date,
          spaces: r.spaces_confirmed || 0,
          deposit: parseFloat(r.deposit_amount?.toString() || '0'),
        })),
        totalSpaces,
        totalDeposit,
        earliestEvent,
      };
    });

    // Sort by earliest event date (soonest first), then by studio name
    const sortedStudios = studiosWithDetails.sort((a, b) => {
      if (!a.earliestEvent && !b.earliestEvent) return a.name.localeCompare(b.name);
      if (!a.earliestEvent) return 1;
      if (!b.earliestEvent) return -1;
      return a.earliestEvent.getTime() - b.earliestEvent.getTime();
    });

    return {
      studios: sortedStudios,
      count: sortedStudios.length,
    };
  }),

  /**
   * Send account claiming invitations to selected studios
   * Competition Director or Super Admin
   * CDs can only send to studios in their tenant
   */
  sendInvitations: publicProcedure
    .input(
      z.object({
        studioIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is competition_director or super_admin
      if (!['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can send invitations',
        });
      }

      if (input.studioIds.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No studios selected',
        });
      }

      // Build where clause with tenant filtering for CDs
      const whereClause: any = {
        id: { in: input.studioIds },
        owner_id: null, // Only unclaimed
        status: 'approved',
      };

      // CDs can only send to studios in their tenant
      if (ctx.userRole === 'competition_director' && ctx.tenantId) {
        whereClause.tenant_id = ctx.tenantId;
      }

      // Fetch studios with details
      const studios = await prisma.studios.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          public_code: true,
          internal_notes: true, // CD comments for invitation
          tenants: {
            select: {
              name: true,
              subdomain: true,
            },
          },
          reservations: {
            where: {
              status: { in: ['approved', 'adjusted'] },
            },
            select: {
              spaces_confirmed: true,
              deposit_amount: true,
              credits_applied: true,
              discount_percentage: true,
              competitions: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (studios.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No eligible studios found',
        });
      }

      const results = {
        sent: [] as string[],
        failed: [] as { studio: string; error: string }[],
      };

      // Send emails to each studio
      for (const studio of studios) {
        try {
          // Skip if no email
          if (!studio.email) {
            results.failed.push({
              studio: studio.name,
              error: 'No email address on file',
            });
            continue;
          }

          const claimUrl = `https://${studio.tenants.subdomain}.compsync.net/claim?code=${studio.public_code}`;

          // Build email HTML
          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claim Your ${studio.tenants.name} Account</title>
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
                Hi <strong>${studio.name}</strong>,
              </p>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! You've been pre-approved for <strong>${studio.tenants.name}</strong> competitions.
              </p>

              ${
                studio.internal_notes
                  ? `
              <!-- CD Personal Message -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Personal Message from Competition Director
                    </p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
${studio.internal_notes}
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
                    <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 18px; font-weight: 600;">Your Reservations:</h2>
                    ${studio.reservations
                      .map(
                        (r) => `
                    <div style="margin-bottom: 10px; padding-left: 10px; border-left: 3px solid #667eea;">
                      <strong style="color: #374151;">${r.competitions.name}</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">
                        ${r.spaces_confirmed} entries • $${r.deposit_amount} deposit${
                          r.credits_applied && parseFloat(r.credits_applied.toString()) > 0
                            ? ` • $${r.credits_applied} credits`
                            : ''
                        }${
                          r.discount_percentage && parseFloat(r.discount_percentage.toString()) > 0
                            ? ` • ${r.discount_percentage}% discount`
                            : ''
                        }
                      </span>
                    </div>
                    `
                      )
                      .join('')}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>Your Studio Code:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #667eea; font-weight: bold;">${
                  studio.public_code
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
                — ${studio.tenants.name} Team
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

          const emailSubject = `Claim Your ${studio.tenants.name} Account - ${studio.name}`;

          await sendEmail({
            to: studio.email,
            subject: emailSubject,
            html: emailHtml,
          });

          // Mark invitation as sent
          await prisma.studios.update({
            where: { id: studio.id },
            data: { invited_at: new Date() },
          });

          // Log email send to database
          await prisma.email_logs.create({
            data: {
              template_type: 'studio_invitation',
              recipient_email: studio.email,
              subject: emailSubject,
              studio_id: studio.id,
              competition_id: null,
              success: true,
              tenant_id: ctx.tenantId!,
              sent_at: new Date(),
            },
          });

          results.sent.push(studio.name);
          logger.info('Studio invitation sent', {
            studioId: studio.id,
            studioName: studio.name,
            email: studio.email,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          results.failed.push({
            studio: studio.name,
            error: errorMessage,
          });

          // Log failed email to database
          try {
            await prisma.email_logs.create({
              data: {
                template_type: 'studio_invitation',
                recipient_email: studio.email || 'unknown',
                subject: `Claim Your ${studio.tenants.name} Account - ${studio.name}`,
                studio_id: studio.id,
                competition_id: null,
                success: false,
                error_message: errorMessage,
                tenant_id: ctx.tenantId!,
                sent_at: new Date(),
              },
            });
          } catch (logError) {
            // Don't fail the whole operation if logging fails
            logger.error('Failed to log email error', { logError });
          }

          logger.error('Failed to send studio invitation', {
            error: error instanceof Error ? error : new Error(String(error)),
            studioId: studio.id,
            studioName: studio.name,
          });
        }
      }

      return {
        success: true,
        sent: results.sent.length,
        failed: results.failed.length,
        details: results,
      };
    }),

  /**
   * Update studio email address
   * Competition Director or Super Admin
   * CDs can only update studios in their tenant
   */
  updateStudioEmail: publicProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is competition_director or super_admin
      if (!['competition_director', 'super_admin'].includes(ctx.userRole || '')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Competition Directors can update studio emails',
        });
      }

      // Build where clause with tenant filtering for CDs
      const whereClause: any = {
        id: input.studioId,
      };

      // CDs can only update studios in their tenant
      if (ctx.userRole === 'competition_director' && ctx.tenantId) {
        whereClause.tenant_id = ctx.tenantId;
      }

      // Verify studio exists and user has access
      const studio = await prisma.studios.findFirst({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!studio) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Studio not found or access denied',
        });
      }

      // Update the email
      await prisma.studios.update({
        where: { id: input.studioId },
        data: { email: input.email },
      });

      logger.info('Studio email updated', {
        studioId: studio.id,
        studioName: studio.name,
        oldEmail: studio.email,
        newEmail: input.email,
        updatedBy: ctx.userId,
      });

      return {
        success: true,
        message: `Email updated to ${input.email}`,
      };
    }),
});
