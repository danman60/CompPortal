import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { isStudioDirector, isAdmin, isSuperAdmin } from '@/lib/auth-utils';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { render as renderEmail } from '@react-email/render';
import WelcomeEmail from '@/emails/WelcomeEmail';
import {
  renderStudioApproved,
  renderStudioRejected,
  renderStudioProfileSubmitted,
  getEmailSubject,
  type StudioApprovedData,
  type StudioRejectedData,
  type StudioProfileSubmittedData,
} from '@/lib/email-templates';
import { supabaseAdmin } from '@/lib/supabase-server';

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

export const studioRouter = router({
  // Lookup studio by public code
  lookupByCode: publicProcedure
    .input(z.object({
      code: z.string().length(5, 'Code must be exactly 5 characters'),
    }))
    .query(async ({ input }) => {
      const studio = await prisma.studios.findUnique({
        where: { public_code: input.code.toUpperCase() },
        select: {
          id: true,
          name: true,
          public_code: true,
          city: true,
          province: true,
          status: true,
          email: true,
          tenant_id: true,
          owner_id: true,
        },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      return studio;
    }),

  // Lookup studio by account recovery token (for legacy token-based claim links)
  lookupByToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      // Look up the token in account_recovery_tokens
      const recoveryToken = await prisma.account_recovery_tokens.findUnique({
        where: { token: input.token },
        select: { studio_id: true },
      });

      if (!recoveryToken?.studio_id) {
        throw new Error('Invalid or expired token');
      }

      // Get the studio's public code
      const studio = await prisma.studios.findUnique({
        where: { id: recoveryToken.studio_id },
        select: { public_code: true },
      });

      if (!studio?.public_code) {
        throw new Error('Studio not found');
      }

      return { public_code: studio.public_code };
    }),

  // Claim studio ownership (bypasses RLS for unclaimed studios)
  claimStudio: protectedProcedure
    .input(z.object({
      studioId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new Error('Not authenticated');
      }

      // Use Prisma (bypasses RLS) to update studio ownership
      const studio = await prisma.studios.findUnique({
        where: { id: input.studioId },
        select: { id: true, owner_id: true, tenant_id: true, name: true, public_code: true },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      if (studio.owner_id !== null) {
        throw new Error('Studio already claimed');
      }

      // Get user details for notification
      const userProfile = await prisma.user_profiles.findUnique({
        where: { id: userId },
        select: {
          first_name: true,
          last_name: true,
        },
      });

      // Get tenant details
      const tenant = await prisma.tenants.findUnique({
        where: { id: studio.tenant_id },
        select: { name: true, subdomain: true },
      });

      // Update ownership
      await prisma.studios.update({
        where: { id: input.studioId },
        data: { owner_id: userId },
      });

      // Update user role to studio_director AND set tenant_id
      await prisma.user_profiles.update({
        where: { id: userId },
        data: {
          role: 'studio_director',
          tenant_id: studio.tenant_id, // CRITICAL: Set tenant to prevent cross-contamination
        },
      });

      // SECURITY: Update auth.users.user_metadata with tenant_id
      // Required because dashboard/page.tsx checks user.user_metadata.tenant_id
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { tenant_id: studio.tenant_id }
      });

      // Activity logging
      try {
        await logActivity({
          userId,
          studioId: studio.id,
          action: 'studio.claim',
          entityType: 'studio',
          entityId: studio.id,
          details: {
            studio_name: studio.name,
            studio_code: studio.public_code,
            tenant_id: studio.tenant_id,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (studio.claim)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      // Get Competition Director for this tenant
      const competitionDirector = await prisma.user_profiles.findFirst({
        where: {
          tenant_id: studio.tenant_id,
          role: 'competition_director',
        },
        select: {
          id: true,
        },
      });

      // Get CD email from auth.users if available
      let cdEmail: string | null = null;
      if (competitionDirector?.id) {
        const authUser = await prisma.$queryRaw<{ email: string }[]>`
          SELECT email FROM auth.users WHERE id = ${competitionDirector.id}::uuid LIMIT 1
        `;
        cdEmail = authUser[0]?.email || null;
      }

      // Get claimer's email
      const authUserClaimer = await prisma.$queryRaw<{ email: string }[]>`
        SELECT email FROM auth.users WHERE id = ${userId}::uuid LIMIT 1
      `;
      const claimerEmail = authUserClaimer[0]?.email || 'Unknown';

      // Send notification email to Super Admin AND tenant CD
      const { sendEmail } = await import('@/lib/email');
      const emailRecipients = ['danieljohnabrahamson@gmail.com'];
      if (cdEmail) {
        emailRecipients.push(cdEmail);
      }

      const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Studio Claimed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f3f4f6; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h1 style="color: #8b5cf6; margin: 0 0 20px 0;">🎉 Studio Account Claimed!</h1>

    <div style="background-color: #f9fafb; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 10px 0; color: #374151;"><strong>Studio:</strong> ${studio.name}</p>
      <p style="margin: 0 0 10px 0; color: #374151;"><strong>Code:</strong> ${studio.public_code}</p>
      <p style="margin: 0 0 10px 0; color: #374151;"><strong>Competition:</strong> ${tenant?.name || 'Unknown'}</p>
      <p style="margin: 0 0 10px 0; color: #374151;"><strong>Subdomain:</strong> ${tenant?.subdomain}.compsync.net</p>
    </div>

    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <p style="margin: 0 0 10px 0; color: #374151;"><strong>Claimed By:</strong> ${userProfile?.first_name || ''} ${userProfile?.last_name || ''}</p>
      <p style="margin: 0 0 0 0; color: #374151;"><strong>Email:</strong> ${claimerEmail}</p>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
      This studio account has been successfully claimed. The user now has Studio Director access.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
      CompSync Notification System
    </p>
  </div>
</body>
</html>
      `;

      try {
        // Send to all recipients
        for (const recipient of emailRecipients) {
          const emailResult = await sendEmail({
            to: recipient,
            subject: `🎉 Studio Claimed: ${studio.name} (${tenant?.name})`,
            templateType: 'studio-claimed',
            studioId: studio.id,
            html: emailTemplate,
          });

          // Log email result
          if (!emailResult.success) {
            logger.error('Failed to send claim notification email', {
              error: new Error(emailResult.error || 'Unknown email error'),
              studioId: studio.id,
              studioName: studio.name,
              recipient,
            });
          } else {
            logger.info('Claim notification email sent', {
              studioId: studio.id,
              studioName: studio.name,
              to: recipient,
            });
          }
        }
      } catch (emailError) {
        // Don't fail the claim if email fails - just log it
        logger.error('Failed to send claim notification email - exception', {
          error: emailError instanceof Error ? emailError : new Error(String(emailError)),
          studioId: studio.id,
          studioName: studio.name,
        });
      }

      return { success: true, studioId: input.studioId };
    }),

  // Get all studios
  // Super admins can see studios across all tenants
  getAll: publicProcedure
    .input(
      z
        .object({
          tenantId: z.string().uuid().optional(), // Super admin can filter by specific tenant
        })
        .nullish()
    )
    .query(async ({ ctx, input }) => {
    const { tenantId } = input ?? {};

    const where: any = {};

    // Tenant filtering: super admins can see all tenants or filter by specific tenant
    if (isSuperAdmin(ctx.userRole)) {
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      // No tenant filter if super admin and no specific tenant requested
    } else {
      // Non-super admins only see their own tenant's studios
      if (ctx.tenantId) {
        where.tenant_id = ctx.tenantId;
      } else {
        // If no tenant context, return empty array
        return { studios: [], count: 0 };
      }
    }

    // Studio directors can only see their own studio (studio.ts:42-49 sets ctx.studioId)
    if (isStudioDirector(ctx.userRole)) {
      // SECURITY: Block access if studioId is missing (prevents data leak)
      if (!ctx.studioId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Studio not found. Please contact support.',
        });
      }
      where.id = ctx.studioId;
    }

    const studios = await prisma.studios.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        address1: true,
        city: true,
        province: true,
        postal_code: true,
        country: true,
        status: true,
        email: true,
        phone: true,
        website: true,
        created_at: true,
        _count: {
          select: {
            dancers: true,
            competition_entries: true,
            reservations: true,
          },
        },
        // Include active reservations for withdraw functionality
        reservations: {
          where: {
            status: { not: 'cancelled' },
          },
          select: {
            id: true,
            competition_id: true,
            status: true,
            competitions: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      studios,
      count: studios.length,
    };
  }),

  // Get a single studio by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const studio = await prisma.studios.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              dancers: true,
              reservations: true,
              competition_entries: true,
            },
          },
          dancers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              date_of_birth: true,
            },
          },
        },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      return studio;
    }),

  // Get studios with statistics
  getStats: publicProcedure.query(async ({ ctx }) => {
    // Super Admin gets cross-tenant stats, others get tenant-filtered
    const isSuperAdmin = ctx.userRole === 'super_admin';

    if (!isSuperAdmin && !ctx.tenantId) {
      return { total: 0, pending: 0, approved: 0, withDancers: 0 };
    }

    const whereClause = isSuperAdmin ? {} : { tenant_id: ctx.tenantId! };

    const [total, pending, approved, withDancers] = await Promise.all([
      prisma.studios.count({ where: whereClause }),
      prisma.studios.count({ where: { ...whereClause, status: 'pending' } }),
      prisma.studios.count({ where: { ...whereClause, status: 'approved' } }),
      prisma.studios.count({
        where: {
          ...whereClause,
          dancers: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      withDancers,
    };
  }),

  // Create a new studio
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // For now, using a dummy owner_id - will be replaced with actual auth
      const dummyOwnerId = '00000000-0000-0000-0000-000000000000';

      // Generate unique public code
      const generatePublicCode = async (): Promise<string> => {
        let attempts = 0;
        while (attempts < 10) {
          const code = Math.random().toString(36).substring(2, 7).toUpperCase()
            .replace(/0/g, 'A').replace(/O/g, 'B').replace(/I/g, 'C').replace(/1/g, 'D');
          const exists = await prisma.studios.findUnique({ where: { public_code: code } });
          if (!exists) return code;
          attempts++;
        }
        throw new Error('Failed to generate unique public code');
      };

      const studio = await prisma.studios.create({
        data: {
          name: input.name,
          public_code: await generatePublicCode(),
          email: input.email,
          phone: input.phone,
          city: input.city,
          province: input.province,
          country: input.country ?? 'Canada',
          owner_id: dummyOwnerId,
          tenant_id: ctx.tenantId!,
          status: 'pending',
        },
      });

      // Send "studio_profile_submitted" email to Competition Directors (non-blocking)
      try {
        // Get tenant subdomain and branding for URL construction and email styling
        const tenant = await prisma.tenants.findUnique({
          where: { id: ctx.tenantId! },
          select: { subdomain: true, branding: true },
        });

        if (!tenant) {
          throw new Error('Tenant not found');
        }

        const portalUrl = `https://${tenant.subdomain}.compsync.net`;
        const branding = tenant.branding as { primaryColor?: string; secondaryColor?: string } | null;

        // Get all Competition Directors for this tenant
        const competitionDirectors = await prisma.user_profiles.findMany({
          where: {
            tenant_id: ctx.tenantId!,
            role: 'competition_director',
          },
          select: {
            id: true,
            first_name: true,
          },
        });

        // Send email to each CD who has this preference enabled
        for (const cd of competitionDirectors) {
          const isEnabled = await isEmailEnabled(cd.id, 'studio_profile_submitted');
          if (!isEnabled) continue;

          const cdEmail = await getUserEmail(cd.id);
          if (!cdEmail) continue;

          const emailData: StudioProfileSubmittedData = {
            studioName: studio.name,
            studioEmail: studio.email || '',
            city: studio.city || undefined,
            province: studio.province || undefined,
            portalUrl: `${portalUrl}/dashboard/admin/studios`,
            tenantBranding: branding || undefined,
          };

          const html = await renderStudioProfileSubmitted(emailData);
          const subject = getEmailSubject('studio-profile-submitted', {
            studioName: studio.name,
          });

          await sendEmail({
            to: cdEmail,
            subject,
            html,
            templateType: 'studio-profile-submitted',
            studioId: studio.id,
          });
        }
      } catch (error) {
        logger.error('Failed to send studio profile submitted email to CDs', {
          error: error instanceof Error ? error : new Error(String(error)),
          studioId: studio.id,
        });
        // Don't throw - email failure shouldn't block studio creation
      }

      return studio;
    }),

  // Update an existing studio
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          name: z.string().min(2).max(255).optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          address1: z.string().optional(),
          city: z.string().optional(),
          province: z.string().optional(),
          postal_code: z.string().optional(),
          country: z.string().optional(),
          logo_url: z.string().url().optional().or(z.literal('')),
          website: z.string().url().optional().or(z.literal('')),
          social_media: z.any().optional(), // JSON field for social links
          settings: z.any().optional(), // JSON field for branding
        }),
      })
    )
    .mutation(async ({ input }) => {
      const studio = await prisma.studios.update({
        where: { id: input.id },
        data: input.data,
      });

      return studio;
    }),

  // Approve a studio
  approve: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only super admins and competition directors can approve studios
      if (isStudioDirector(ctx.userRole)) {
        throw new Error('Studio directors cannot approve studios');
      }

      const studio = await prisma.studios.update({
        where: { id: input.id },
        data: {
          status: 'approved',
          verified_at: new Date(),
          verified_by: ctx.userId,
          updated_at: new Date(),
        },
        include: {
          tenants: {
            select: {
              name: true,
              subdomain: true,
              branding: true,
            },
          },
        },
      });

      // Fetch owner email from auth.users and profile separately
      let ownerEmail: string | null = null;
      let ownerProfile: { first_name: string | null; last_name: string | null } | null = null;

      if (studio.owner_id) {
        // Get email from auth.users
        const authUser = await prisma.$queryRaw<{ email: string }[]>`
          SELECT email FROM auth.users WHERE id = ${studio.owner_id}::uuid LIMIT 1
        `;
        ownerEmail = authUser[0]?.email || null;

        // Get profile from user_profiles
        ownerProfile = await prisma.user_profiles.findUnique({
          where: { id: studio.owner_id },
          select: { first_name: true, last_name: true },
        });
      }

      // Activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: studio.id,
          action: 'studio.approve',
          entityType: 'studio',
          entityId: studio.id,
          details: {
            studio_name: studio.name,
            owner_id: studio.owner_id,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (studio.approve)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      // Send approval email to studio owner
      if (ownerEmail && studio.owner_id) {
        try {
          // Check if studio_approved email preference is enabled
          const isEnabled = await isEmailEnabled(studio.owner_id, 'studio_approved');

          if (isEnabled) {
            const ownerName = ownerProfile && (ownerProfile.first_name || ownerProfile.last_name)
              ? `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim()
              : undefined;

            const portalUrl = `https://${studio.tenants.subdomain}.compsync.net`;
            const branding = studio.tenants?.branding as { primaryColor?: string; secondaryColor?: string; logo?: string } | null;
            const emailData: StudioApprovedData = {
              studioName: studio.name,
              ownerName,
              portalUrl: `${portalUrl}/dashboard`,
              tenantBranding: branding || undefined,
            };

            const html = await renderStudioApproved(emailData);
            const subject = getEmailSubject('studio-approved', { studioName: studio.name });

            await sendEmail({
              to: ownerEmail,
              subject,
              html,
            });

            // Also send welcome email
            const tenantName = studio.tenants?.name || 'Competition Portal';
            const welcomeHtml = await renderEmail(
              WelcomeEmail({
                name: ownerName || 'Studio Owner',
                email: ownerEmail,
                studioPublicCode: studio.public_code || undefined,
                dashboardUrl: `${portalUrl}/dashboard`,
                tenantBranding: {
                  tenantName: studio.tenants?.name,
                  primaryColor: branding?.primaryColor,
                  secondaryColor: branding?.secondaryColor,
                  logo: branding?.logo,
                },
              })
            );
            await sendEmail({
              to: ownerEmail,
              subject: `Welcome to ${tenantName} - Studio Approved!`,
              html: welcomeHtml,
            });
          }
        } catch (error) {
          logger.error('Failed to send approval email', { error: error instanceof Error ? error : new Error(String(error)) });
          // Don't throw - email failure shouldn't block the approval
        }
      }

      return studio;
    }),

  // Reject a studio
  reject: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only super admins and competition directors can reject studios
      if (isStudioDirector(ctx.userRole)) {
        throw new Error('Studio directors cannot reject studios');
      }

      const studio = await prisma.studios.update({
        where: { id: input.id },
        data: {
          status: 'rejected',
          comments: input.reason,
          verified_by: ctx.userId,
          updated_at: new Date(),
        },
        include: {
          tenants: {
            select: {
              subdomain: true,
              branding: true,
            },
          },
        },
      });

      // Fetch owner email from auth.users and profile separately
      let ownerEmail: string | null = null;
      let ownerProfile: { first_name: string | null; last_name: string | null } | null = null;

      if (studio.owner_id) {
        // Get email from auth.users
        const authUser = await prisma.$queryRaw<{ email: string }[]>`
          SELECT email FROM auth.users WHERE id = ${studio.owner_id}::uuid LIMIT 1
        `;
        ownerEmail = authUser[0]?.email || null;

        // Get profile from user_profiles
        ownerProfile = await prisma.user_profiles.findUnique({
          where: { id: studio.owner_id },
          select: { first_name: true, last_name: true },
        });
      }

      // Activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: studio.id,
          action: 'studio.reject',
          entityType: 'studio',
          entityId: studio.id,
          details: {
            studio_name: studio.name,
            owner_id: studio.owner_id,
            rejection_reason: input.reason || 'No reason provided',
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (studio.reject)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      // Send rejection email to studio owner
      if (ownerEmail && studio.owner_id) {
        try {
          // Check if studio_rejected email preference is enabled
          const isEnabled = await isEmailEnabled(studio.owner_id, 'studio_rejected');

          if (isEnabled) {
            const ownerName = ownerProfile && (ownerProfile.first_name || ownerProfile.last_name)
              ? `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim()
              : undefined;

            const portalUrl = `https://${studio.tenants.subdomain}.compsync.net`;
            const branding = studio.tenants?.branding as { primaryColor?: string; secondaryColor?: string } | null;
            const emailData: StudioRejectedData = {
              studioName: studio.name,
              ownerName,
              reason: input.reason,
              portalUrl: `${portalUrl}/dashboard`,
              contactEmail: process.env.CONTACT_EMAIL || 'info@example.com',
              tenantBranding: branding || undefined,
            };

            const html = await renderStudioRejected(emailData);
            const subject = getEmailSubject('studio-rejected', { studioName: studio.name });

            await sendEmail({
              to: ownerEmail,
              subject,
              html,
            });
          }
        } catch (error) {
          logger.error('Failed to send rejection email', { error: error instanceof Error ? error : new Error(String(error)) });
          // Don't throw - email failure shouldn't block the rejection
        }
      }

      return studio;
    }),

  // Delete a studio (Competition Directors and Super Admins only)
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only CDs and super admins can delete studios
      if (!isAdmin(ctx.userRole)) {
        throw new Error('Only competition directors and super admins can delete studios');
      }

      const studio = await prisma.studios.findUnique({
        where: { id: input.id },
        select: {
          name: true,
          tenant_id: true,
          _count: {
            select: {
              dancers: true,
              competition_entries: true,
              reservations: true,
            },
          },
          reservations: {
            where: {
              status: 'approved',
            },
            select: {
              id: true,
              competition_id: true,
              spaces_confirmed: true,
            },
          },
        },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      let totalRefunded = 0;

      await prisma.$transaction(async (tx) => {
        // Refund approved reservation spaces back to competitions BEFORE deleting
        for (const reservation of studio.reservations) {
          const spacesToRefund = reservation.spaces_confirmed || 0;
          if (spacesToRefund > 0) {
            // Increment competition capacity
            await tx.competitions.update({
              where: { id: reservation.competition_id },
              data: {
                available_reservation_tokens: {
                  increment: spacesToRefund,
                },
              },
            });

            // Log refund to capacity ledger
            await tx.capacity_ledger.create({
              data: {
                tenant_id: studio.tenant_id,
                competition_id: reservation.competition_id,
                reservation_id: reservation.id,
                change_amount: spacesToRefund, // Positive = refund
                reason: 'studio_hard_delete',
                created_by: ctx.userId,
              },
            });

            totalRefunded += spacesToRefund;
          }
        }

        // Hard delete: CASCADE delete all related records
        // Delete competition entries (references studio_id)
        await tx.competition_entries.deleteMany({
          where: { studio_id: input.id },
        });

        // Delete dancers (references studio_id)
        await tx.dancers.deleteMany({
          where: { studio_id: input.id },
        });

        // Delete reservations (references studio_id)
        await tx.reservations.deleteMany({
          where: { studio_id: input.id },
        });

        // Finally, hard delete the studio itself
        await tx.studios.delete({
          where: { id: input.id },
        });
      });

      // Activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: input.id,
          action: 'studio.delete',
          entityType: 'studio',
          entityId: input.id,
          details: {
            studio_name: studio.name,
            dancers_count: studio._count.dancers,
            entries_count: studio._count.competition_entries,
            reservations_count: studio._count.reservations,
            spaces_refunded: totalRefunded,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (studio.delete)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: 'Studio deleted and spaces refunded',
        deletedCounts: {
          dancers: studio._count.dancers,
          entries: studio._count.competition_entries,
          reservations: studio._count.reservations,
        },
        spacesRefunded: totalRefunded,
      };
    }),

  // Withdraw a studio from a specific competition (soft delete)
  // Keeps dancers, cancels reservation/entries, refunds capacity, voids unpaid invoices
  withdrawFromCompetition: protectedProcedure
    .input(z.object({
      studioId: z.string().uuid(),
      competitionId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only CDs and super admins can withdraw studios
      if (!isAdmin(ctx.userRole)) {
        throw new Error('Only competition directors and super admins can withdraw studios');
      }

      const studio = await prisma.studios.findUnique({
        where: { id: input.studioId },
        select: {
          id: true,
          name: true,
          tenant_id: true,
        },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Find the reservation for this competition
      const reservation = await prisma.reservations.findFirst({
        where: {
          studio_id: input.studioId,
          competition_id: input.competitionId,
          status: { not: 'cancelled' },
        },
        select: {
          id: true,
          spaces_confirmed: true,
          spaces_requested: true,
          status: true,
        },
      });

      if (!reservation) {
        throw new Error('No active reservation found for this studio and competition');
      }

      // Get the competition name for logging
      const competition = await prisma.competitions.findUnique({
        where: { id: input.competitionId },
        select: { name: true },
      });

      let spacesRefunded = 0;
      let entriesCancelled = 0;
      let invoicesVoided = 0;

      await prisma.$transaction(async (tx) => {
        // 1. Refund capacity if reservation was approved
        const spacesToRefund = reservation.spaces_confirmed || 0;
        if (spacesToRefund > 0 && (reservation.status === 'approved' || reservation.status === 'invoiced' || reservation.status === 'summarized')) {
          await tx.competitions.update({
            where: { id: input.competitionId },
            data: {
              available_reservation_tokens: {
                increment: spacesToRefund,
              },
            },
          });

          // Log to capacity ledger
          await tx.capacity_ledger.create({
            data: {
              tenant_id: studio.tenant_id,
              competition_id: input.competitionId,
              reservation_id: reservation.id,
              change_amount: spacesToRefund,
              reason: 'studio_withdraw',
              created_by: ctx.userId,
            },
          });

          spacesRefunded = spacesToRefund;
        }

        // 2. Cancel reservation (soft delete)
        await tx.reservations.update({
          where: { id: reservation.id },
          data: {
            status: 'cancelled',
            updated_at: new Date(),
          },
        });

        // 3. Cancel all entries for this reservation
        const cancelledEntries = await tx.competition_entries.updateMany({
          where: {
            reservation_id: reservation.id,
            status: { not: 'cancelled' },
          },
          data: {
            status: 'cancelled',
            updated_at: new Date(),
          },
        });
        entriesCancelled = cancelledEntries.count;

        // 4. Void any unpaid invoices for this reservation
        const voidedInvoices = await tx.invoices.updateMany({
          where: {
            reservation_id: reservation.id,
            status: { in: ['DRAFT', 'SENT'] },
          },
          data: {
            status: 'VOIDED',
            updated_at: new Date(),
          },
        });
        invoicesVoided = voidedInvoices.count;

        // 5. Delete any summaries for this reservation (summaries don't have status)
        await tx.summaries.deleteMany({
          where: {
            reservation_id: reservation.id,
          },
        });
      });

      // Activity logging (non-blocking)
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: input.studioId,
          action: 'studio.withdraw',
          entityType: 'reservation',
          entityId: reservation.id,
          details: {
            studio_name: studio.name,
            competition_name: competition?.name,
            competition_id: input.competitionId,
            reason: input.reason || 'Studio withdrawal',
            spaces_refunded: spacesRefunded,
            entries_cancelled: entriesCancelled,
            invoices_voided: invoicesVoided,
          },
        });
      } catch (err) {
        logger.error('Failed to log activity (studio.withdraw)', { error: err instanceof Error ? err : new Error(String(err)) });
      }

      return {
        success: true,
        message: `${studio.name} withdrawn from ${competition?.name || 'competition'}`,
        spacesRefunded,
        entriesCancelled,
        invoicesVoided,
      };
    }),

  // Get studios with entries for a specific competition (for scheduler)
  getStudiosForCompetition: publicProcedure
    .input(
      z.object({
        competitionId: z.string().uuid(),
        tenantId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      const { competitionId, tenantId } = input;
      const studios = await prisma.studios.findMany({
        where: {
          tenant_id: tenantId,
          competition_entries: {
            some: { competition_id: competitionId },
          },
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              competition_entries: {
                where: { competition_id: competitionId },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
      return studios.map((studio) => ({
        id: studio.id,
        name: studio.name,
        entryCount: studio._count.competition_entries,
      }));
    }),
});
