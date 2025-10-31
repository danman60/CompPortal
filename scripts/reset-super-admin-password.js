const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const email = 'danieljohnabrahamson@gmail.com';
  const newPassword = '1CompSyncLogin!';

  console.log(`\n=== RESETTING PASSWORD FOR SUPER ADMIN ===`);
  console.log(`Email: ${email}`);
  console.log(`New Password: ${newPassword}\n`);

  try {
    // Update user password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      'b3aebafa-e291-452a-8197-f7012338687c', // Super admin user ID
      { password: newPassword }
    );

    if (error) {
      console.error('ERROR:', error.message);
      process.exit(1);
    }

    console.log('✅ Password reset successful!');
    console.log('\nYou can now login at:');
    console.log('  https://empwr.compsync.net/login');
    console.log('\nCredentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${newPassword}`);
    console.log('\n✅ DONE\n');
  } catch (err) {
    console.error('FATAL ERROR:', err);
    process.exit(1);
  }
}

resetPassword();
