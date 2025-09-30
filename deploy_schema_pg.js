const { Client } = require('pg');
const fs = require('fs');

// Database connection configuration - using direct connection (not pooler)
const connectionString = 'postgresql://postgres:!EH4TtrJ2-V!5b_@db.cafugvuaatsgihrsmvvl.supabase.co:5432/postgres';

async function deploySchema() {
  console.log('🚀 Starting CompPortal schema deployment...\n');

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect to database
    console.log('📡 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read schema file
    console.log('📄 Loading schema file...');
    const schemaPath = './supabase/schema.sql';
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(`✅ Schema loaded: ${schema.length} characters (1,105 lines)\n`);

    // Execute schema
    console.log('⚙️  Executing schema deployment...');
    console.log('   This may take 30-60 seconds...\n');

    const startTime = Date.now();
    await client.query(schema);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Schema deployed successfully in ${duration} seconds!\n`);

    // Verify deployment - count tables
    console.log('🔍 Verifying deployment...');
    const result = await client.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `);

    const tableCount = result.rows[0].table_count;
    console.log(`✅ Found ${tableCount} tables in public schema\n`);

    if (tableCount >= 30) {
      console.log('🎉 Deployment verification PASSED!');
      console.log('   Expected 30+ tables, found', tableCount);
      return true;
    } else {
      console.log('⚠️  Warning: Expected 30+ tables, but found', tableCount);
      return false;
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    return false;
  } finally {
    await client.end();
    console.log('\n📡 Database connection closed');
  }
}

// Run deployment
deploySchema().then(success => {
  if (success) {
    console.log('\n✅ CompPortal schema deployment complete!');
    process.exit(0);
  } else {
    console.log('\n❌ Schema deployment verification failed');
    process.exit(1);
  }
}).catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
