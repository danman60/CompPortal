import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-server';
import { logActivity } from '@/lib/activity';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

/**
 * Account Recovery Router
 *
 * Handles account recovery for studios whose auth accounts were deleted
 * but studio data remains intact.
 *
 * Flow:
 * 1. SA detects orphaned studios (studio.owner_id → non-existent auth.users)
 * 2. SA pre-creates auth accounts with random passwords
 * 3. SA generates recovery tokens
 * 4. SA sends recovery email (manual button)
 * 5. User clicks link → sets password → auto-login → sees studio
 */

export const accountRecoveryRouter = router({
  /**
   * Get list of orphaned studios (studio.owner_id points to deleted auth user)
   */
  getOrphanedStudios: protectedProcedure.query(async ({ ctx }) => {
    if (!isSuperAdmin(ctx.userRole)) {
      throw new Error('Only super admins can access account recovery');
    }

    // Find studios where owner_id doesn't exist in auth.users
    // Include studios with NULL owner_id AND studios with deleted auth users
    const studios = await prisma.studios.findMany({
      where: {
        // No filter - check all studios
      },
      select: {
        id: true,
        code: true,
        name: true,
        email: true,
        owner_id: true,
        tenant_id: true,
        status: true,
        created_at: true,
        _count: {
          select: {
            dancers: true,
          },
        },
        tenants: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // First, get all studios with active recovery tokens
    const studiosWithActiveTokens = await prisma.account_recovery_tokens.findMany({
      where: {
        used_at: null,
        expires_at: {
          gte: new Date(),
        },
      },
      select: {
        studio_id: true,
        created_at: true,
        expires_at: true,
      },
    });

    const tokenMap = new Map(
      studiosWithActiveTokens.map((t) => [t.studio_id, t])
    );

    // Check which studios are orphaned (no valid auth) OR have active tokens
    const orphanedStudios = [];
    for (const studio of studios) {
      // Skip studios without email (can't recover them anyway)
      if (!studio.email) continue;

      let isOrphaned = false;

      // PRIORITY 1: Studio has active recovery token = always show (ready for email)
      if (tokenMap.has(studio.id)) {
        orphanedStudios.push({
          ...studio,
          dancer_count: studio._count.dancers,
        });
        continue; // Skip auth check - token means ready to send email
      }

      // PRIORITY 2: Check if truly orphaned (has owner_id but auth deleted)
      // NOTE: NULL owner_id = unclaimed account (needs invitation, not recovery)
      if (!studio.owner_id) {
        // Skip - NULL owner_id means unclaimed, not orphaned
        continue;
      }

      // Check if auth user exists
      try {
        const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(
          studio.owner_id
        );
        if (error || !authUser.user) {
          // Auth user doesn't exist = orphaned (needs recovery)
          isOrphaned = true;
        }
      } catch (err) {
        // Error checking auth = likely deleted user = orphaned
        isOrphaned = true;
      }

      if (isOrphaned) {
        orphanedStudios.push({
          ...studio,
          dancer_count: studio._count.dancers,
        });
      }
    }

    return orphanedStudios.map((studio) => ({
      ...studio,
      has_recovery_token: tokenMap.has(studio.id),
      recovery_token_created: tokenMap.get(studio.id)?.created_at,
      recovery_token_expires: tokenMap.get(studio.id)?.expires_at,
    }));
  }),

  /**
   * Prepare account recovery for a studio
   * Creates auth account + generates recovery token
   */
  prepareRecovery: protectedProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can prepare account recovery');
      }

      const studio = await prisma.studios.findUnique({
        where: { id: input.studioId },
        include: {
          tenants: true,
        },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      if (!studio.email) {
        throw new Error('Studio has no email address');
      }

      // Check if auth user already exists with this email
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser.users.find((u) => u.email === studio.email);

      let authUserId: string;

      if (userExists) {
        authUserId = userExists.id;
        logger.info('Auth user already exists', { email: studio.email, userId: authUserId });
      } else {
        // Create auth account with random password
        const randomPassword = randomBytes(32).toString('hex');
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: studio.email,
          password: randomPassword,
          email_confirm: true, // Auto-confirm since we're recovering
        });

        if (error || !newUser.user) {
          const errorMsg = error?.message || 'Unknown error';
          logger.error('Failed to create auth user', { errorMsg, email: studio.email });
          throw new Error(`Failed to create auth account: ${errorMsg}`);
        }

        authUserId = newUser.user.id;
        logger.info('Created auth user for recovery', { email: studio.email, userId: authUserId });
      }

      // Update studio.owner_id to link to auth account
      await prisma.studios.update({
        where: { id: studio.id },
        data: { owner_id: authUserId },
      });

      // Generate secure recovery token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      // Store recovery token
      await prisma.account_recovery_tokens.create({
        data: {
          tenant_id: studio.tenant_id,
          studio_id: studio.id,
          email: studio.email,
          token,
          expires_at: expiresAt,
        },
      });

      await logActivity({
        userId: ctx.userId,
        action: 'account_recovery.prepared',
        entityType: 'studio',
        entityId: studio.id,
        details: {
          studio_name: studio.name,
          studio_code: studio.code,
          email: studio.email,
          auth_user_id: authUserId,
        },
      });

      return {
        success: true,
        authUserId,
        token,
        expiresAt,
      };
    }),

  /**
   * Send recovery email to studio
   */
  sendRecoveryEmail: protectedProcedure
    .input(
      z.object({
        studioId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSuperAdmin(ctx.userRole)) {
        throw new Error('Only super admins can send recovery emails');
      }

      const studio = await prisma.studios.findUnique({
        where: { id: input.studioId },
        include: {
          tenants: true,
        },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Get active recovery token
      const recoveryToken = await prisma.account_recovery_tokens.findFirst({
        where: {
          studio_id: studio.id,
          used_at: null,
          expires_at: {
            gte: new Date(),
          },
        },
        orderBy: { created_at: 'desc' },
      });

      if (!recoveryToken) {
        throw new Error('No active recovery token found. Please prepare recovery first.');
      }

      // Build recovery URL
      const baseUrl = `https://${studio.tenants?.subdomain}.compsync.net`;
      const recoveryUrl = `${baseUrl}/account-recovery?token=${recoveryToken.token}`;

      // Send email
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Account Security Update</h2>
          <p>Hello ${studio.name},</p>
          <p>We recently had to update our account security system, and you'll need to recreate your password to continue accessing your CompSync account.</p>
          <p>Your studio data, including all your dancers and registrations, is safe and ready for you.</p>
          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 15px 0;"><strong>What you need to do:</strong></p>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Click the button below</li>
              <li>Create a new password (you can use your old password if you want)</li>
              <li>You'll be logged in and see all your data</li>
            </ol>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${recoveryUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Set Your Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This link will expire in 7 days. If you have any questions, please contact support.</p>
          <p>Best regards,<br/>${studio.tenants?.name || 'CompSync'} Team</p>
        </div>
      `;

      if (!studio.email) {
        throw new Error('Studio has no email address');
      }

      const result = await sendEmail({
        to: studio.email,
        subject: 'Action Required: Update Your CompSync Password',
        html,
        templateType: 'account-recovery',
        studioId: studio.id,
      });

      if (!result.success) {
        const errorMsg = result.error || 'Unknown error';
        logger.error('Failed to send recovery email', { studioId: studio.id, errorMsg });
        throw new Error(`Failed to send email: ${errorMsg}`);
      }

      await logActivity({
        userId: ctx.userId,
        action: 'account_recovery.email_sent',
        entityType: 'studio',
        entityId: studio.id,
        details: {
          studio_name: studio.name,
          email: studio.email,
        },
      });

      return { success: true };
    }),

  /**
   * Validate recovery token (public endpoint for recovery page)
   */
  validateToken: protectedProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const recoveryToken = await prisma.account_recovery_tokens.findUnique({
        where: { token: input.token },
        include: {
          studios: {
            select: {
              id: true,
              code: true,
              name: true,
              email: true,
              tenant_id: true,
            },
          },
        },
      });

      if (!recoveryToken) {
        return { valid: false, reason: 'invalid' };
      }

      if (recoveryToken.used_at) {
        return { valid: false, reason: 'used' };
      }

      if (new Date() > recoveryToken.expires_at) {
        return { valid: false, reason: 'expired' };
      }

      return {
        valid: true,
        studio: recoveryToken.studios,
      };
    }),

  /**
   * Complete recovery by setting password
   */
  completeRecovery: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      // Validate token
      const recoveryToken = await prisma.account_recovery_tokens.findUnique({
        where: { token: input.token },
        include: {
          studios: true,
        },
      });

      if (!recoveryToken) {
        throw new Error('Invalid recovery token');
      }

      if (recoveryToken.used_at) {
        throw new Error('Recovery token already used');
      }

      if (new Date() > recoveryToken.expires_at) {
        throw new Error('Recovery token expired');
      }

      const studio = recoveryToken.studios;

      // Get auth user by email
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = users.users.find((u) => u.email === studio.email);

      if (!authUser) {
        throw new Error('Auth user not found. Please contact support.');
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: input.password }
      );

      if (updateError) {
        logger.error('Failed to update password', { error: updateError, userId: authUser.id });
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      // Mark token as used
      await prisma.account_recovery_tokens.update({
        where: { id: recoveryToken.id },
        data: { used_at: new Date() },
      });

      // Create session for auto-login
      let magicLink: string | undefined;
      if (studio.email) {
        const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: studio.email,
        });

        if (sessionError) {
          logger.error('Failed to generate session', { error: sessionError });
          // Don't throw - password was updated successfully
        } else {
          magicLink = session?.properties?.action_link;
        }
      }

      await logActivity({
        userId: authUser.id,
        action: 'account_recovery.completed',
        entityType: 'studio',
        entityId: studio.id,
        details: {
          studio_name: studio.name,
          email: studio.email,
        },
      });

      return {
        success: true,
        email: studio.email,
        magicLink,
      };
    }),
});
