const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function execute() {
  const sql = fs.readFileSync('../tester-150-routines.sql', 'utf8');

  console.log('📄 Executing SQL via Supabase...');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ SQL executed successfully');

  // Verify
  const { data: count } = await supabase
    .from('competition_entries')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', '00000000-0000-0000-0000-000000000003')
    .gte('entry_number', 125)
    .lte('entry_number', 274);

  console.log(`✅ Verified: ${count?.count || 0} entries inserted`);
}

execute();
