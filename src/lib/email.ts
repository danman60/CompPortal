import { Resend } from 'resend';

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
}: SendEmailParams) {
  const client = getResendClient();

  if (!client) {
    console.error('Email sending disabled: RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    const data = await client.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
