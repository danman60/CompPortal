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
   * Get list of unclaimed studios (owner_id = NULL)
   * Super Admin only
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
      include: {
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
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        tenant_id: 'asc',
      },
    });

    return {
      studios: studios.map((studio) => {
        const totalSpaces = studio.reservations.reduce((sum, r) => sum + (r.spaces_confirmed || 0), 0);
        const totalDeposit = studio.reservations.reduce((sum, r) => sum + parseFloat(r.deposit_amount?.toString() || '0'), 0);

        return {
          id: studio.id,
          name: studio.name,
          publicCode: studio.public_code,
          email: studio.email,
          tenantName: studio.tenants.name,
          tenantSubdomain: studio.tenants.subdomain,
          reservationCount: studio.reservations.length,
          competitions: studio.reservations.map((r) => r.competitions.name),
          totalSpaces,
          totalDeposit,
        };
      }),
      count: studios.length,
    };
  }),

  /**
   * Send account claiming invitations to selected studios
   * Super Admin only
   */
  sendInvitations: publicProcedure
    .input(
      z.object({
        studioIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is super_admin
      if (ctx.userRole !== 'super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Super Admin can send invitations',
        });
      }

      if (input.studioIds.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No studios selected',
        });
      }

      // Fetch studios with details
      const studios = await prisma.studios.findMany({
        where: {
          id: { in: input.studioIds },
          owner_id: null, // Only unclaimed
          status: 'approved',
        },
        include: {
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

          // Calculate totals from all reservations
          const totalEntries = studio.reservations.reduce(
            (sum, r) => sum + (r.spaces_confirmed || 0),
            0
          );
          const totalDeposit = studio.reservations.reduce(
            (sum, r) => sum + parseFloat(r.deposit_amount?.toString() || '0'),
            0
          );
          const totalCredits = studio.reservations.reduce(
            (sum, r) => sum + parseFloat(r.credits_applied?.toString() || '0'),
            0
          );

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

                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                      <strong style="color: #1f2937;">Total:</strong>
                      <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">
                        ${totalEntries} entries • $${totalDeposit.toFixed(2)} deposits${
            totalCredits > 0 ? ` • $${totalCredits.toFixed(2)} credits` : ''
          }
                      </div>
                    </div>
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

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Once you claim your account, you'll be able to:
              </p>
              <ul style="margin: 10px 0; padding-left: 25px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                <li>Enter your studio contact details</li>
                <li>Add your dancers to the roster</li>
                <li>View your approved reservations and competition schedule</li>
              </ul>

              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Questions? Reply to this email and we'll be happy to help!
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
                This is an automated invitation email. Do not reply if you have questions.
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

          await sendEmail({
            to: studio.email,
            subject: `Claim Your ${studio.tenants.name} Account - ${studio.name}`,
            html: emailHtml,
          });

          results.sent.push(studio.name);
          logger.info('Studio invitation sent', {
            studioId: studio.id,
            studioName: studio.name,
            email: studio.email,
          });
        } catch (error) {
          results.failed.push({
            studio: studio.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
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
});
