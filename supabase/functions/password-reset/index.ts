import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate branded password reset email HTML
function generatePasswordResetEmail({
  tenantName,
  email,
  resetUrl,
  primaryColor,
  secondaryColor,
}: {
  tenantName: string;
  email: string;
  resetUrl: string;
  primaryColor: string;
  secondaryColor: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your ${tenantName} password</title>
</head>
<body style="background-color: #0f172a; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif; padding: 20px 0; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); padding: 20px 0 48px; margin-bottom: 64px;">

    <h1 style="color: #f1f5f9; font-size: 32px; font-weight: bold; margin: 40px 0; padding: 0 40px; text-align: center;">
      🔐 Reset Your Password
    </h1>

    <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0 40px; margin: 12px 0;">
      We received a request to reset the password for your ${tenantName} account.
    </p>

    <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0 40px; margin: 12px 0;">
      Click the button below to create a new password:
    </p>

    <div style="text-align: center; padding: 30px 40px;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}); border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 48px; border: none;">
        Reset Password
      </a>
    </div>

    <div style="background-color: rgba(139, 92, 246, 0.1); border-radius: 12px; padding: 24px 30px; margin: 24px 40px; border-left: 4px solid ${primaryColor};">
      <p style="color: #c4b5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
        YOUR ACCOUNT
      </p>
      <p style="color: #f1f5f9; font-size: 18px; font-weight: 600; margin: 0;">
        ${email}
      </p>
    </div>

    <p style="color: #cbd5e1; font-size: 14px; line-height: 22px; padding: 0 40px; margin: 8px 0;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="color: ${primaryColor}; font-size: 14px; line-height: 22px; padding: 0 40px; margin: 8px 0; word-break: break-all;">
      ${resetUrl}
    </p>

    <div style="background-color: rgba(251, 191, 36, 0.1); border-radius: 12px; padding: 20px 30px; margin: 24px 40px; border-left: 4px solid #f59e0b;">
      <p style="color: #fbbf24; font-size: 14px; line-height: 22px; margin: 0;">
        ⚠️ This link will expire in 1 hour for security reasons.
      </p>
    </div>

    <hr style="border-color: rgba(255, 255, 255, 0.1); margin: 32px 40px;">

    <p style="color: #cbd5e1; font-size: 14px; line-height: 22px; padding: 0 40px; margin: 8px 0;">
      If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
    </p>

    <p style="color: #94a3b8; font-size: 14px; line-height: 24px; padding: 0 40px; text-align: center;">
      © 2025 ${tenantName}. Powered by CompSync.
    </p>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, tenant_id, redirect_to } = await req.json();

    // Validate required fields
    if (!email || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Validate tenant exists (CRITICAL for multi-tenant security)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, subdomain, branding')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('Invalid tenant:', tenant_id, tenantError);
      return new Response(
        JSON.stringify({ error: 'Invalid tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Tenant validated:', tenant.name, tenant_id);

    // 2. Check if user exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const user = existingUsers?.users?.find((u) => u.email === email);

    if (!user) {
      // Don't reveal whether email exists for security
      console.log('Email not found, but returning success to prevent enumeration:', email);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User found:', user.id, email);

    // 3. Generate password reset token with tenant-scoped redirect
    const tenantUrl = `https://${tenant.subdomain}.compsync.net`;
    const redirectUrl = redirect_to || `${tenantUrl}/login`;

    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (tokenError || !tokenData.properties?.action_link) {
      console.error('Token generation failed:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate reset link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resetUrl = tokenData.properties.action_link;
    console.log('Reset link generated for:', email);

    // 4. Get tenant branding for email
    const branding = (tenant.branding as any) || {};
    const primaryColor = branding.primaryColor || '#8b5cf6'; // purple-500
    const secondaryColor = branding.secondaryColor || '#ec4899'; // pink-500

    // 5. Send password reset email via Mailgun
    const emailHtml = generatePasswordResetEmail({
      tenantName: tenant.name,
      email,
      resetUrl,
      primaryColor,
      secondaryColor,
    });

    try {
      const mailgunResponse = await fetch(
        `https://api.mailgun.net/v3/compsync.net/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${Deno.env.get('MAILGUN_API_KEY')}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            from: `${tenant.name} <noreply@compsync.net>`,
            to: email,
            subject: `Reset your ${tenant.name} password`,
            html: emailHtml,
          }),
        }
      );

      if (!mailgunResponse.ok) {
        const errorText = await mailgunResponse.text();
        console.error('Mailgun error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to send reset email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Password reset email sent to:', email);
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send reset email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
