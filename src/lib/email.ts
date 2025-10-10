import nodemailer from 'nodemailer';
import { prisma } from './prisma';

/**
 * Email service using SMTP (PrivateEmail)
 * Required env:
 *  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * Optional:
 *  - SMTP_SECURE ("true" to use TLS/465)
 *  - EMAIL_FROM (fallback sender)
 */

let transporter: nodemailer.Transporter | null = null;

function getSmtpTransport() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    if (!host || !user || !pass) {
      console.warn('SMTP not configured (missing SMTP_HOST/SMTP_USER/SMTP_PASS). Email disabled.');
      return null;
    }

    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  }
  return transporter;
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
export async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM || 'noreply@glowdance.com', replyTo, templateType, studioId, competitionId, }: SendEmailParams) {
  const smtp = getSmtpTransport();
  const recipientEmail = Array.isArray(to) ? to[0] : to;
  let success = false;
  let errorMessage: string | undefined;

  if (!smtp) {
    console.error('Email sending disabled: SMTP not configured');
    errorMessage = 'Email service not configured';
  } else {
    try {
      await smtp.sendMail({
        from,
        to,
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
