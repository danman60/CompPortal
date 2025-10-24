import { Resend } from 'resend';
import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Email service using Resend
 * Required env: RESEND_API_KEY
 * Optional: EMAIL_FROM (fallback sender)
 */

let resend: Resend | null = null;

function getResendClient() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('Resend not configured (missing RESEND_API_KEY). Email disabled.');
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
    logger.error('Email sending disabled: Resend not configured');
    errorMessage = 'Email service not configured';
  } else {
    try {
      const { data, error } = await client.emails.send({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo,
      });

      if (error) {
        logger.error('Email send error from Resend', { error });
        errorMessage = error.message || 'Unknown Resend error';
      } else {
        success = true;
        logger.info('Email sent successfully', {
          id: data?.id,
          to: recipientEmail,
          template: templateType
        });
      }
    } catch (error) {
      logger.error('Email send exception', { error: error instanceof Error ? error : new Error(String(error)) });
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
      logger.error('Failed to log email', { error: logError instanceof Error ? logError : new Error(String(logError)) });
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
