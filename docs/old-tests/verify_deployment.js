const { Client } = require('pg');

const connectionString = 'postgresql://postgres:!EH4TtrJ2-V!5b_@db.cafugvuaatsgihrsmvvl.supabase.co:5432/postgres';

async function verifyDeployment() {
  console.log('🔍 Verifying CompPortal schema deployment...\n');

  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // List all tables
    console.log('📋 Tables created:');
    console.log('='.repeat(60));
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    tablesResult.rows.forEach((row, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${row.table_name}`);
    });
    console.log('='.repeat(60));
    console.log(`Total: ${tablesResult.rows.length} tables\n`);

    // Verify seed data - Classifications
    console.log('📊 Seed Data Verification:\n');

    console.log('1. Classifications:');
    const classifications = await client.query('SELECT name, skill_level FROM classifications ORDER BY skill_level');
    if (classifications.rows.length > 0) {
      classifications.rows.forEach(row => console.log(`   - ${row.name} (Level ${row.skill_level})`));
      console.log(`   ✅ ${classifications.rows.length} classifications loaded\n`);
    } else {
      console.log('   ❌ No classifications found\n');
    }

    // Age groups
    console.log('2. Age Groups:');
    const ageGroups = await client.query('SELECT name, min_age, max_age FROM age_groups ORDER BY sort_order');
    if (ageGroups.rows.length > 0) {
      ageGroups.rows.forEach(row => console.log(`   - ${row.name} (${row.min_age}-${row.max_age} years)`));
      console.log(`   ✅ ${ageGroups.rows.length} age groups loaded\n`);
    } else {
      console.log('   ❌ No age groups found\n');
    }

    // Dance categories
    console.log('3. Dance Categories:');
    const danceCategories = await client.query('SELECT name FROM dance_categories ORDER BY sort_order');
    if (danceCategories.rows.length > 0) {
      danceCategories.rows.forEach(row => console.log(`   - ${row.name}`));
      console.log(`   ✅ ${danceCategories.rows.length} dance categories loaded\n`);
    } else {
      console.log('   ❌ No dance categories found\n');
    }

    // Entry size categories
    console.log('4. Entry Size Categories:');
    const entrySizes = await client.query('SELECT name, min_participants, max_participants FROM entry_size_categories ORDER BY sort_order');
    if (entrySizes.rows.length > 0) {
      entrySizes.rows.forEach(row => console.log(`   - ${row.name} (${row.min_participants}-${row.max_participants} dancers)`));
      console.log(`   ✅ ${entrySizes.rows.length} entry sizes loaded\n`);
    } else {
      console.log('   ❌ No entry sizes found\n');
    }

    // System settings
    console.log('5. System Settings:');
    const settings = await client.query('SELECT key, category FROM system_settings ORDER BY category, key');
    if (settings.rows.length > 0) {
      settings.rows.forEach(row => console.log(`   - ${row.key} (${row.category})`));
      console.log(`   ✅ ${settings.rows.length} system settings loaded\n`);
    } else {
      console.log('   ❌ No system settings found\n');
    }

    // Email templates
    console.log('6. Email Templates:');
    const templates = await client.query('SELECT template_key, name FROM email_templates ORDER BY template_key');
    if (templates.rows.length > 0) {
      templates.rows.forEach(row => console.log(`   - ${row.template_key}: ${row.name}`));
      console.log(`   ✅ ${templates.rows.length} email templates loaded\n`);
    } else {
      console.log('   ❌ No email templates found\n');
    }

    // Check for RLS policies
    console.log('7. Row Level Security (RLS):');
    const rlsPolicies = await client.query(`
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY tablename;
    `);
    if (rlsPolicies.rows.length > 0) {
      rlsPolicies.rows.forEach(row => console.log(`   - ${row.tablename}: ${row.policy_count} policies`));
      console.log(`   ✅ RLS configured on ${rlsPolicies.rows.length} tables\n`);
    } else {
      console.log('   ⚠️  No RLS policies found\n');
    }

    // Check functions
    console.log('8. Database Functions:');
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      AND routine_name NOT LIKE 'pg_%'
      ORDER BY routine_name;
    `);
    if (functions.rows.length > 0) {
      functions.rows.forEach(row => console.log(`   - ${row.routine_name}()`));
      console.log(`   ✅ ${functions.rows.length} custom functions created\n`);
    } else {
      console.log('   ❌ No custom functions found\n');
    }

    console.log('='.repeat(60));
    console.log('✅ Deployment verification complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  } finally {
    await client.end();
  }

  return true;
}

verifyDeployment().then(success => {
  process.exit(success ? 0 : 1);
});
