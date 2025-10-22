import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { isStudioDirector } from '@/lib/auth-utils';
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
  // Get all studios
  getAll: publicProcedure.query(async () => {
    const studios = await prisma.studios.findMany({
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
  getStats: publicProcedure.query(async () => {
    const [total, pending, approved, withDancers] = await Promise.all([
      prisma.studios.count(),
      prisma.studios.count({ where: { status: 'pending' } }),
      prisma.studios.count({ where: { status: 'approved' } }),
      prisma.studios.count({
        where: {
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

      const studio = await prisma.studios.create({
        data: {
          name: input.name,
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
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/admin/studios`,
          };

          const html = await renderStudioProfileSubmitted(emailData);
          const subject = getEmailSubject('studio-profile-submitted', {
            studioName: studio.name,
          });

          await sendEmail({
            to: cdEmail,
            subject,
            html,
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
          users_studios_owner_idTousers: {
            select: {
              id: true,
              email: true,
              user_profiles: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      });

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
      if (studio.users_studios_owner_idTousers?.email && studio.users_studios_owner_idTousers.id) {
        try {
          // Check if studio_approved email preference is enabled
          const isEnabled = await isEmailEnabled(studio.users_studios_owner_idTousers.id, 'studio_approved');

          if (isEnabled) {
            const profile = studio.users_studios_owner_idTousers.user_profiles;
            const ownerName = profile && (profile.first_name || profile.last_name)
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              : undefined;

            const emailData: StudioApprovedData = {
              studioName: studio.name,
              ownerName,
              portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
            };

            const html = await renderStudioApproved(emailData);
            const subject = getEmailSubject('studio-approved', { studioName: studio.name });

            await sendEmail({
              to: studio.users_studios_owner_idTousers.email,
              subject,
              html,
            });

            // Also send welcome email
            const welcomeHtml = await renderEmail(
              WelcomeEmail({
                name: ownerName || 'Studio Owner',
                email: studio.users_studios_owner_idTousers.email,
                dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
                tenantBranding: undefined,
              })
            );
            await sendEmail({
              to: studio.users_studios_owner_idTousers.email,
              subject: 'Welcome to CompPortal - Studio Approved!',
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
          users_studios_owner_idTousers: {
            select: {
              id: true,
              email: true,
              user_profiles: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      });

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
      if (studio.users_studios_owner_idTousers?.email && studio.users_studios_owner_idTousers.id) {
        try {
          // Check if studio_rejected email preference is enabled
          const isEnabled = await isEmailEnabled(studio.users_studios_owner_idTousers.id, 'studio_rejected');

          if (isEnabled) {
            const profile = studio.users_studios_owner_idTousers.user_profiles;
            const ownerName = profile && (profile.first_name || profile.last_name)
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              : undefined;

            const emailData: StudioRejectedData = {
              studioName: studio.name,
              ownerName,
              reason: input.reason,
              portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
              contactEmail: process.env.CONTACT_EMAIL || 'info@example.com',
            };

            const html = await renderStudioRejected(emailData);
            const subject = getEmailSubject('studio-rejected', { studioName: studio.name });

            await sendEmail({
              to: studio.users_studios_owner_idTousers.email,
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
});
