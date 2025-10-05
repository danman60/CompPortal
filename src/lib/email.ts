import { Resend } from 'resend';
import { prisma } from './prisma';

/**
 * Email service using Resend
 * Requires RESEND_API_KEY environment variable
 */

// Lazy initialization to avoid errors during build when API key is not available
let resend: Resend | null = null;

function getResendClient() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not configured. Email functionality will be disabled.');
      return null;
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  // Optional fields for email logging
  templateType?: string;
  studioId?: string;
  competitionId?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.EMAIL_FROM || 'noreply@glowdance.com',
  replyTo,
  templateType,
  studioId,
  competitionId,
}: SendEmailParams) {
  const client = getResendClient();
  const recipientEmail = Array.isArray(to) ? to[0] : to;
  let success = false;
  let errorMessage: string | undefined;

  if (!client) {
    console.error('Email sending disabled: RESEND_API_KEY not configured');
    errorMessage = 'Email service not configured';
  } else {
    try {
      const data = await client.emails.send({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo,
      });

      success = true;
    } catch (error) {
      console.error('Email send error:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  // Log email to database if template type is provided
  if (templateType) {
    try {
      await prisma.email_logs.create({
        data: {
          template_type: templateType,
          recipient_email: recipientEmail,
          subject,
          studio_id: studioId || null,
          competition_id: competitionId || null,
          success,
          error_message: errorMessage || null,
        },
      });
    } catch (logError) {
      console.error('Failed to log email:', logError);
      // Don't fail the email send if logging fails
    }
  }

  if (!success) {
    return {
      success: false,
      error: errorMessage,
    };
  }

  return { success: true };
}

/**
 * Email template types
 */
export type EmailTemplate =
  | 'registration-confirmation'
  | 'payment-reminder'
  | 'schedule-notification'
  | 'invoice-delivery'
  | 'reservation-approved'
  | 'reservation-declined'
  | 'entry-submitted';
