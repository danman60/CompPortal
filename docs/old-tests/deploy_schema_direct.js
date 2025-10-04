const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://cafugvuaatsgihrsmvvl.supabase.co';
const serviceRoleKey = 'sb_secret_4awE8z8fbv-bk2KSYjSp_Q_T_zpXh25';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deploySchema() {
  console.log('🚀 Starting schema deployment to CompPortal Supabase...\n');

  // Read the schema file
  const schemaPath = './supabase/schema.sql';
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log(`📄 Loaded schema: ${schema.length} characters\n`);

  // Use the SQL RPC endpoint
  const { data, error } = await supabase.rpc('exec', { sql: schema });

  if (error) {
    console.error('❌ Deployment failed:', error);
    return false;
  }

  console.log('✅ Schema deployed successfully!');
  console.log('Response:', data);
  return true;
}

deploySchema().then(success => {
  if (success) {
    console.log('\n🎉 Deployment complete! Verifying...');
    process.exit(0);
  } else {
    console.log('\n❌ Deployment failed');
    process.exit(1);
  }
}).catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
