import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate branded confirmation email HTML
function generateConfirmationEmail({
  tenantName,
  email,
  confirmationUrl,
  primaryColor,
  secondaryColor,
}: {
  tenantName: string;
  email: string;
  confirmationUrl: string;
  primaryColor: string;
  secondaryColor: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your ${tenantName} account</title>
</head>
<body style="background-color: #0f172a; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif; padding: 20px 0; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); padding: 20px 0 48px; margin-bottom: 64px;">

    <h1 style="color: #f1f5f9; font-size: 32px; font-weight: bold; margin: 40px 0; padding: 0 40px; text-align: center;">
      ✨ Welcome to ${tenantName}!
    </h1>

    <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0 40px; margin: 12px 0;">
      Thanks for creating an account. We're excited to have you on board!
    </p>

    <p style="color: #e2e8f0; font-size: 16px; line-height: 26px; padding: 0 40px; margin: 12px 0;">
      To complete your registration and access your studio dashboard, please confirm your email address by clicking the button below:
    </p>

    <div style="text-align: center; padding: 30px 40px;">
      <a href="${confirmationUrl}" style="display: inline-block; background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}); border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 48px; border: none;">
        Confirm Email Address
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
      ${confirmationUrl}
    </p>

    <hr style="border-color: rgba(255, 255, 255, 0.1); margin: 32px 40px;">

    <p style="color: #cbd5e1; font-size: 14px; line-height: 22px; padding: 0 40px; margin: 8px 0;">
      If you didn't create this account, you can safely ignore this email.
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
    const { email, password, tenant_id } = await req.json();

    // Validate required fields
    if (!email || !password || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, tenant_id' }),
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
      .select('id, name, subdomain')
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

    // 2. Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some((u) => u.email === email);

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create auth user (email_confirm: false, we'll send custom email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't confirm yet, send custom email
      user_metadata: {
        tenant_id, // Store in auth metadata for reference
      },
    });

    if (authError || !authData.user) {
      console.error('Auth user creation failed:', authError);
      return new Response(
        JSON.stringify({ error: authError?.message || 'User creation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth user created:', authData.user.id, email);
    // Note: user_profiles record is created automatically by handle_new_user() trigger

    // 4. Generate email confirmation token with tenant-scoped redirect
    const tenantUrl = `https://${tenant.subdomain}.compsync.net`;
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${tenantUrl}/login`,
      },
    });

    if (tokenError || !tokenData.properties?.action_link) {
      console.error('Token generation failed:', tokenError);
      // Don't rollback, user can request resend
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account created. Contact support for confirmation link.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const confirmationUrl = tokenData.properties.action_link;
    console.log('Confirmation link generated:', confirmationUrl);

    // 5. Fetch tenant branding for email
    const { data: tenantSettings } = await supabaseAdmin
      .from('tenants')
      .select('primary_color, secondary_color')
      .eq('id', tenant_id)
      .single();

    const primaryColor = tenantSettings?.primary_color || '#8b5cf6'; // purple-500
    const secondaryColor = tenantSettings?.secondary_color || '#ec4899'; // pink-500

    // 6. Send confirmation email via Mailgun
    const emailHtml = generateConfirmationEmail({
      tenantName: tenant.name,
      email,
      confirmationUrl,
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
            subject: `Confirm your ${tenant.name} account`,
            html: emailHtml,
          }),
        }
      );

      if (!mailgunResponse.ok) {
        const errorText = await mailgunResponse.text();
        console.error('Mailgun error:', errorText);
        // Don't fail signup if email fails - user can request resend
      } else {
        console.log('Confirmation email sent to:', email);
      }
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      // Continue - email failure shouldn't block signup
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created! Check your email for confirmation link.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
