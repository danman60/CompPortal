import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

/**
 * Vercel Cron Job - Daily Feedback Digest
 *
 * Sends daily email digest of new feedback to Super Admin at 8am EST.
 * Configured in vercel.json crons array.
 *
 * Authentication: Vercel cron jobs include special headers for verification
 *
 * Created: November 7, 2025
 */
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate Vercel Cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized feedback digest cron request attempted', {
          hasAuthHeader: !!authHeader,
          hasCronSecret: !!cronSecret,
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    logger.info('Feedback digest cron job started');

    // Get all feedback from the last 24 hours with status = 'new'
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const newFeedback = await prisma.user_feedback.findMany({
      where: {
        created_at: {
          gte: yesterday,
        },
        status: 'new',
      },
      include: {
        tenants: {
          select: { name: true },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    logger.info('New feedback found', { count: newFeedback.length });

    // If no new feedback, skip
    if (newFeedback.length === 0) {
      logger.info('No new feedback to send, skipping digest');
      return NextResponse.json({
        success: true,
        message: 'No new feedback to send',
        count: 0,
      });
    }

    // Build email HTML
    const feedbackTypeLabels: Record<string, string> = {
      dream_feature: '🌟 Dream Feature',
      clunky_experience: '🐌 Clunky Experience',
      bug_report: '🐛 Bug Report',
      general: '💬 General Feedback',
    };

    const feedbackItems = newFeedback.map((feedback) => {
      const stars = feedback.star_rating ? '⭐'.repeat(feedback.star_rating) : 'No rating';
      const typeLabel = feedbackTypeLabels[feedback.feedback_type] || feedback.feedback_type;

      return `
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <strong style="color: #1f2937; font-size: 16px;">${typeLabel}</strong>
              <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
                ${feedback.user_name || 'Anonymous'} (${feedback.user_email})
              </div>
              <div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">
                ${feedback.tenants.name} | ${feedback.user_role === 'studio_director' ? 'Studio Director' : 'Competition Director'}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px;">${stars}</div>
              <div style="color: #9ca3af; font-size: 12px; margin-top: 4px;">
                ${new Date(feedback.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          </div>
          <div style="color: #374151; line-height: 1.6; margin-top: 12px;">
            ${feedback.comment.replace(/\n/g, '<br/>')}
          </div>
          ${feedback.page_url ? `<div style="color: #9ca3af; font-size: 12px; margin-top: 8px;">📍 ${feedback.page_url}</div>` : ''}
        </div>
      `;
    }).join('');

    // Calculate stats
    const stats = {
      total: newFeedback.length,
      byType: Object.entries(
        newFeedback.reduce((acc, f) => {
          acc[f.feedback_type] = (acc[f.feedback_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([type, count]) => `${feedbackTypeLabels[type]}: ${count}`).join(' | '),
      avgRating: newFeedback.filter(f => f.star_rating !== null).length > 0
        ? (newFeedback.filter(f => f.star_rating !== null).reduce((sum, f) => sum + (f.star_rating || 0), 0) / newFeedback.filter(f => f.star_rating !== null).length).toFixed(1)
        : 'N/A',
    };

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">💡 Daily Feedback Digest</h1>
          <p style="color: #e0e7ff; margin-top: 8px; font-size: 14px;">CompSync User Feedback - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        <div style="padding: 30px;">
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 12px 0; color: #1e40af; font-size: 18px;">📊 Summary</h2>
            <div style="color: #1f2937;">
              <div style="margin-bottom: 8px;"><strong>Total Feedback:</strong> ${stats.total}</div>
              <div style="margin-bottom: 8px;"><strong>Breakdown:</strong> ${stats.byType}</div>
              <div><strong>Average Rating:</strong> ${stats.avgRating} ${stats.avgRating !== 'N/A' ? '⭐' : ''}</div>
            </div>
          </div>

          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 20px;">Recent Feedback</h2>
          ${feedbackItems}

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: center;">
            <a href="https://empwr.compsync.net/dashboard/admin/feedback"
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View All Feedback in Admin Panel
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p>This is an automated daily digest sent at 8am EST.</p>
            <p>To configure digest settings, contact your system administrator.</p>
          </div>
        </div>
      </div>
    `;

    // Send email to Super Admin
    const superAdminEmail = 'danieljohnabrahamson@gmail.com';

    await sendEmail({
      to: superAdminEmail,
      subject: `[CompSync] Daily Feedback Digest - ${stats.total} New Submission${stats.total !== 1 ? 's' : ''}`,
      html: emailHtml,
      from: process.env.RESEND_FROM_EMAIL || 'noreply@compsync.net',
    });

    logger.info('Feedback digest sent successfully', {
      count: newFeedback.length,
      to: superAdminEmail,
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback digest sent successfully',
      count: newFeedback.length,
      stats,
    });
  } catch (error) {
    logger.error('Feedback digest cron job failed', {
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
