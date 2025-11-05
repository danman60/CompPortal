import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getUsersDueForDigest, generateDigestForUser } from '@/lib/digest-generator';
import { renderDailyDigest, getEmailSubject } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

/**
 * Vercel Cron Job - Daily Digest Sender
 *
 * This endpoint is called by Vercel Cron on a schedule.
 * It checks which Competition Directors are due for their digest
 * and sends emails accordingly.
 *
 * To enable:
 * 1. Uncomment crons array in vercel.json
 * 2. Deploy to Vercel
 * 3. Verify cron job appears in Vercel dashboard
 *
 * Authentication: Vercel cron jobs include special headers for verification
 */
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate Vercel Cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron request attempted', {
          hasAuthHeader: !!authHeader,
          hasCronSecret: !!cronSecret,
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    logger.info('Daily digest cron job started');

    // Get all users due for digest
    const usersDue = await getUsersDueForDigest();

    logger.info('Users due for digest', { count: usersDue.length });

    const results = {
      sent: [] as string[],
      failed: [] as Array<{ userId: string; error: string }>,
      skipped: [] as string[],
      timestamp: new Date().toISOString(),
    };

    // Process each user
    for (const { userId, preferences } of usersDue) {
      try {
        // Generate digest content
        const digestContent = await generateDigestForUser(userId, preferences);

        if (!digestContent) {
          logger.info('Digest skipped (no content)', { userId });
          results.skipped.push(userId);
          continue;
        }

        // Get tenant branding
        const tenant = await prisma.tenants.findUnique({
          where: { id: digestContent.tenantId },
          select: {
            name: true,
            branding: true,
          },
        });

        // Extract branding from JSON field
        const branding = tenant?.branding as any || {};

        // Render email HTML
        const emailHtml = await renderDailyDigest({
          userName: digestContent.userName,
          tenantName: digestContent.tenantName,
          portalUrl: `https://${tenant?.name.toLowerCase().replace(/\s+/g, '')}.compsync.net`,
          pendingActions: digestContent.pendingActions,
          upcomingEvents: digestContent.upcomingEvents,
          recentActivity: digestContent.recentActivity,
          tenantBranding: {
            primaryColor: branding.primary_color || undefined,
            logo: branding.logo_url || undefined,
            tenantName: tenant?.name || undefined,
          },
        });

        const subject = getEmailSubject('daily-digest', {
          tenantName: digestContent.tenantName,
        });

        // Send email
        await sendEmail({
          to: digestContent.userEmail,
          subject,
          html: emailHtml,
          from: process.env.RESEND_FROM_EMAIL || 'noreply@compsync.net',
        });

        // Log activity
        await logActivity({
          userId: 'SYSTEM', // System-triggered
          tenantId: digestContent.tenantId,
          action: 'digest.send',
          entityType: 'user_profile',
          entityId: userId,
          details: {
            summary: digestContent.summary,
            sentBy: 'cron_job',
          },
        });

        logger.info('Digest sent successfully', {
          userId,
          summary: digestContent.summary,
        });

        results.sent.push(userId);
      } catch (error) {
        logger.error('Failed to send digest to user', {
          error: error instanceof Error ? error : new Error(String(error)),
          userId,
        });
        results.failed.push({
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Daily digest cron job completed', results);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Daily digest cron job failed', {
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
