// =====================================================
// CompPortal Whitelabel Email Processor
// =====================================================
// This Edge Function processes queued emails and sends
// them via Mailgun API with tenant-specific branding
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// =====================================================
// Types
// =====================================================
interface EmailQueueItem {
  id: string
  tenant_id: string
  user_id: string
  email_type: 'signup_confirmation' | 'password_recovery' | 'email_change' | 'magic_link'
  recipient_email: string
  template_data: {
    confirmation_token?: string
    recovery_token?: string
    email_change_token?: string
    magic_link_token?: string
    new_email?: string
    old_email?: string
    email: string
    user_id: string
  }
  retry_count: number
  tenants: {
    slug: string
    name: string
    email_from: string
    email_from_name: string
    mailgun_domain: string
    email_template_footer: string | null
  }
}

interface EmailContent {
  subject: string
  html: string
  text: string
}

// =====================================================
// Main Handler
// =====================================================
serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')!
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'

    if (!mailgunApiKey) {
      throw new Error('MAILGUN_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch pending emails with tenant info
    const { data: emails, error: fetchError } = await supabase
      .from('email_queue')
      .select(`
        *,
        tenants (
          slug,
          name,
          email_from,
          email_from_name,
          mailgun_domain,
          email_template_footer
        )
      `)
      .eq('status', 'pending')
      .lt('retry_count', 3) // Max 3 retries
      .order('created_at', { ascending: true })
      .limit(20) // Process 20 at a time

    if (fetchError) {
      console.error('Error fetching emails:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails', details: fetchError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending emails', processed: 0, failed: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let failed = 0
    const results = []

    // Process each email
    for (const email of emails as EmailQueueItem[]) {
      try {
        // Validate tenant configuration
        if (!email.tenants?.mailgun_domain || !email.tenants?.email_from) {
          throw new Error(`Tenant ${email.tenant_id} missing email configuration`)
        }

        // Generate email content based on type
        const content = generateEmailContent(email, siteUrl)

        // Send via Mailgun API
        const mailgunResult = await sendViaMailgun(
          email.tenants.mailgun_domain,
          {
            from: `${email.tenants.email_from_name} <${email.tenants.email_from}>`,
            to: email.recipient_email,
            subject: content.subject,
            html: content.html,
            text: content.text,
          },
          mailgunApiKey
        )

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id)

        processed++
        results.push({
          id: email.id,
          status: 'sent',
          messageId: mailgunResult.id,
        })

        console.log(`✓ Sent ${email.email_type} to ${email.recipient_email} (${email.tenants.name})`)
      } catch (err) {
        console.error(`✗ Failed to send email ${email.id}:`, err)

        // Update with error and increment retry count
        await supabase
          .from('email_queue')
          .update({
            status: email.retry_count >= 2 ? 'failed' : 'pending', // Mark failed after 3 attempts
            error: err.message,
            retry_count: email.retry_count + 1,
          })
          .eq('id', email.id)

        failed++
        results.push({
          id: email.id,
          status: 'failed',
          error: err.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: emails.length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Fatal error in email processor:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// =====================================================
// Email Content Generation
// =====================================================
function generateEmailContent(email: EmailQueueItem, siteUrl: string): EmailContent {
  const tenant = email.tenants
  const data = email.template_data

  switch (email.email_type) {
    case 'signup_confirmation':
      return generateSignupConfirmation(tenant, data, siteUrl)
    case 'password_recovery':
      return generatePasswordRecovery(tenant, data, siteUrl)
    case 'email_change':
      return generateEmailChange(tenant, data, siteUrl)
    default:
      throw new Error(`Unknown email type: ${email.email_type}`)
  }
}

function generateSignupConfirmation(
  tenant: EmailQueueItem['tenants'],
  data: EmailQueueItem['template_data'],
  siteUrl: string
): EmailContent {
  const confirmUrl = `${siteUrl}/${tenant.slug}/auth/confirm?token=${data.confirmation_token}&type=signup`

  const subject = `Welcome to ${tenant.name}!`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">
                Welcome to ${tenant.name}!
              </h1>
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Thanks for signing up! We're excited to have you join our dance community.
              </p>
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Please confirm your email address to get started:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="background-color: #4F46E5; border-radius: 6px; text-align: center;">
                    <a href="${confirmUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 10px 0; color: #6b6b6b; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; color: #4F46E5; font-size: 14px; word-break: break-all;">
                ${confirmUrl}
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                If you didn't create an account with ${tenant.name}, you can safely ignore this email.
              </p>
              ${tenant.email_template_footer || ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
Welcome to ${tenant.name}!

Thanks for signing up! Please confirm your email address by visiting:

${confirmUrl}

If you didn't create an account with ${tenant.name}, you can safely ignore this email.
`

  return { subject, html, text }
}

function generatePasswordRecovery(
  tenant: EmailQueueItem['tenants'],
  data: EmailQueueItem['template_data'],
  siteUrl: string
): EmailContent {
  const resetUrl = `${siteUrl}/${tenant.slug}/auth/reset-password?token=${data.recovery_token}`

  const subject = `Reset your ${tenant.name} password`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">
                Reset Your Password
              </h1>
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                We received a request to reset your password for your ${tenant.name} account. Click the button below to create a new password:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="background-color: #4F46E5; border-radius: 6px; text-align: center;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 10px 0; color: #6b6b6b; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; color: #4F46E5; font-size: 14px; word-break: break-all;">
                ${resetUrl}
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px; line-height: 1.5;">
                This link will expire in 1 hour.
              </p>
              ${tenant.email_template_footer || ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
Reset Your Password

We received a request to reset your password for your ${tenant.name} account. Visit the link below to create a new password:

${resetUrl}

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

This link will expire in 1 hour.
`

  return { subject, html, text }
}

function generateEmailChange(
  tenant: EmailQueueItem['tenants'],
  data: EmailQueueItem['template_data'],
  siteUrl: string
): EmailContent {
  const confirmUrl = `${siteUrl}/${tenant.slug}/auth/confirm?token=${data.email_change_token}&type=email_change`

  const subject = `Confirm your new email address`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">
                Confirm Email Change
              </h1>
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                You requested to change your email address from <strong>${data.old_email}</strong> to <strong>${data.new_email}</strong>.
              </p>
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.5;">
                Please confirm this change by clicking the button below:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="background-color: #4F46E5; border-radius: 6px; text-align: center;">
                    <a href="${confirmUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Confirm New Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 10px 0; color: #6b6b6b; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; color: #4F46E5; font-size: 14px; word-break: break-all;">
                ${confirmUrl}
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                If you didn't request this change, please contact support immediately.
              </p>
              ${tenant.email_template_footer || ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `
Confirm Email Change

You requested to change your email address from ${data.old_email} to ${data.new_email}.

Please confirm this change by visiting:

${confirmUrl}

If you didn't request this change, please contact support immediately.
`

  return { subject, html, text }
}

// =====================================================
// Mailgun API Integration
// =====================================================
async function sendViaMailgun(
  domain: string,
  message: {
    from: string
    to: string
    subject: string
    html: string
    text: string
  },
  apiKey: string
): Promise<{ id: string; message: string }> {
  const formData = new FormData()
  formData.append('from', message.from)
  formData.append('to', message.to)
  formData.append('subject', message.subject)
  formData.append('html', message.html)
  formData.append('text', message.text)

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Mailgun API error (${response.status}): ${errorText}`)
  }

  return await response.json()
}
