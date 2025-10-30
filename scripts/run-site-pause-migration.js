#!/usr/bin/env node
/**
 * Run site pause migration
 * Adds site_paused setting to system_settings table
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

async function runMigration() {
  console.log('\n🔧 Running site pause migration...');

  // Check if setting already exists
  const { data: existing } = await supabase
    .from('system_settings')
    .select('key')
    .eq('key', 'site_paused')
    .single();

  if (existing) {
    console.log('ℹ️  site_paused setting already exists - skipping');
    return;
  }

  // Insert the site_paused setting
  const { data, error } = await supabase
    .from('system_settings')
    .insert({
      key: 'site_paused',
      value: false,
      description: 'Controls whether the site is in maintenance mode. When true, all users except super_admin see maintenance page.',
      category: 'system',
      data_type: 'boolean',
      is_public: false,
      requires_admin: true
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ Migration successful!');
  console.log('Created setting:', {
    key: data.key,
    value: data.value,
    category: data.category,
  });

  console.log('\n✨ Site pause feature is now active!');
  console.log('Super Admin can toggle it from the dashboard.');
}

runMigration().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
