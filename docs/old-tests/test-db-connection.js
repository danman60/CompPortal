const { Client } = require('pg');

async function testConnection() {
  // Test with direct connection
  const directClient = new Client({
    connectionString: 'postgresql://postgres:!EH4TtrJ2-V!5b_@db.cafugvuaatsgihrsmvvl.supabase.co:5432/postgres'
  });

  try {
    console.log('Testing direct connection (port 5432)...');
    await directClient.connect();
    const result = await directClient.query('SELECT NOW()');
    console.log('✅ Direct connection SUCCESS:', result.rows[0]);
    await directClient.end();
  } catch (error) {
    console.error('❌ Direct connection FAILED:', error.message);
  }

  // Test with pooler connection
  const poolerClient = new Client({
    connectionString: 'postgresql://postgres.cafugvuaatsgihrsmvvl:!EH4TtrJ2-V!5b_@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
  });

  try {
    console.log('\nTesting pooler connection (port 6543)...');
    await poolerClient.connect();
    const result = await poolerClient.query('SELECT NOW()');
    console.log('✅ Pooler connection SUCCESS:', result.rows[0]);
    await poolerClient.end();
  } catch (error) {
    console.error('❌ Pooler connection FAILED:', error.message);
  }
}

testConnection();
