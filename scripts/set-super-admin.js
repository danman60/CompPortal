#!/usr/bin/env node
/**
 * Set danieljohnabrahamson@gmail.com as super_admin
 * Removes studio_director role and studio association
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setSuperAdmin() {
  const email = 'danieljohnabrahamson@gmail.com';

  console.log(`\n🔍 Finding user: ${email}`);

  // Find user
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, email, role, studio_id, tenant_id')
    .eq('email', email)
    .single();

  if (findError || !user) {
    console.error('❌ User not found:', findError);
    process.exit(1);
  }

  console.log('✅ Found user:', {
    id: user.id,
    email: user.email,
    currentRole: user.role,
    studioId: user.studio_id,
    tenantId: user.tenant_id
  });

  // Update to super_admin
  console.log('\n🔧 Updating role to super_admin and removing studio association...');

  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({
      role: 'super_admin',
      studio_id: null  // Super admins are not associated with any studio
    })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Update failed:', updateError);
    process.exit(1);
  }

  console.log('✅ User updated successfully:', {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    studioId: updated.studio_id,
    tenantId: updated.tenant_id
  });

  console.log('\n✨ Super Admin configured successfully!');
  console.log(`\nUser ${email} now has:`);
  console.log(`  - Role: super_admin`);
  console.log(`  - Studio access: None (removed)`);
  console.log(`  - Can access: /dashboard/admin/* routes`);
}

setSuperAdmin().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
