#!/usr/bin/env node
/**
 * Update user first name
 * Sets stefanoalyessia@gmail.com first_name to Selena
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

async function updateUserFirstName() {
  const email = 'stefanoalyessia@gmail.com';
  const newFirstName = 'Selena';

  console.log(`\n🔍 Finding user: ${email}`);

  // Find user by email in auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Error fetching users:', authError);
    process.exit(1);
  }

  const user = authUser.users.find(u => u.email === email);

  if (!user) {
    console.error('❌ User not found with email:', email);
    process.exit(1);
  }

  console.log('✅ Found user:', {
    id: user.id,
    email: user.email,
  });

  // Update user_profiles first_name
  console.log(`\n🔧 Updating first_name to "${newFirstName}"...`);

  const { data: updated, error: updateError } = await supabase
    .from('user_profiles')
    .update({ first_name: newFirstName })
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Update failed:', updateError);
    process.exit(1);
  }

  console.log('✅ User updated successfully:', {
    id: updated.id,
    firstName: updated.first_name,
    lastName: updated.last_name,
  });

  console.log(`\n✨ ${email} first name is now "${newFirstName}"!`);
}

updateUserFirstName().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
