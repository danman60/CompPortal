import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // 4. Create user_profiles record (CRITICAL: ensures tenant_id is set)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        tenant_id: tenant_id, // CRITICAL: Multi-tenant isolation
        role: 'studio_director', // Default role for self-signup
      });

    if (profileError) {
      console.error('Profile creation failed:', profileError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Profile creation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User profile created with tenant_id:', tenant_id);

    // 5. Generate email confirmation token
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
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

    // 6. Send confirmation email via Mailgun (TODO: implement)
    // For now, return the confirmation link
    const confirmationUrl = tokenData.properties.action_link;

    console.log('Confirmation link generated:', confirmationUrl);

    // TODO: Send email via Mailgun with tenant branding
    // await sendConfirmationEmail({
    //   email,
    //   tenant_name: tenant.name,
    //   confirmation_url: confirmationUrl,
    // });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created! Check your email for confirmation link.',
        // TEMPORARY: Return link for development testing
        // TODO: Remove this in production
        confirmation_url: confirmationUrl,
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
