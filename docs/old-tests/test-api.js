/**
 * API Testing Script
 * Tests all tRPC routers with production data
 */

const PRODUCTION_URL = 'https://comp-portal-5beova5zd-danman60s-projects.vercel.app';

async function testEndpoint(routerName, procedureName, input = {}) {
  const url = `${PRODUCTION_URL}/api/trpc/${routerName}.${procedureName}`;
  const queryParams = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : '';

  try {
    const response = await fetch(url + queryParams);
    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ ${routerName}.${procedureName} - HTTP ${response.status}`);
      console.error('   Error:', data);
      return null;
    }

    console.log(`✅ ${routerName}.${procedureName} - Success`);
    return data.result.data;
  } catch (error) {
    console.error(`❌ ${routerName}.${procedureName} - ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing CompPortal API Routers\n');
  console.log('Production URL:', PRODUCTION_URL);
  console.log('=' .repeat(60) + '\n');

  // Test Competition Router
  console.log('📋 Competition Router:');
  const competitions = await testEndpoint('competition', 'getAll');
  if (competitions) {
    console.log(`   Found ${competitions.competitions?.length || 0} competitions`);
    console.log(`   Total: ${competitions.total || 0}\n`);
  }

  const upcomingComps = await testEndpoint('competition', 'getUpcoming');
  if (upcomingComps) {
    console.log(`   Upcoming: ${upcomingComps.competitions?.length || 0} competitions\n`);
  }

  // Test Studio Router
  console.log('🏢 Studio Router:');
  const studios = await testEndpoint('studio', 'getAll');
  if (studios) {
    console.log(`   Found ${studios.studios?.length || 0} studios`);
    console.log(`   Total: ${studios.total || 0}\n`);
  }

  // Test Dancer Router
  console.log('👯 Dancer Router:');
  const dancers = await testEndpoint('dancer', 'getAll');
  if (dancers) {
    console.log(`   Found ${dancers.dancers?.length || 0} dancers`);
    console.log(`   Total: ${dancers.total || 0}\n`);
  }

  // Test Reservation Router
  console.log('📅 Reservation Router:');
  const reservations = await testEndpoint('reservation', 'getAll');
  if (reservations) {
    console.log(`   Found ${reservations.reservations?.length || 0} reservations`);
    console.log(`   Total: ${reservations.total || 0}\n`);
  }

  const reservationStats = await testEndpoint('reservation', 'getStats');
  if (reservationStats) {
    console.log(`   Total Requested Spaces: ${reservationStats.totalRequested || 0}`);
    console.log(`   Total Confirmed Spaces: ${reservationStats.totalConfirmed || 0}\n`);
  }

  // Test Entry Router
  console.log('🎭 Entry Router:');
  const entries = await testEndpoint('entry', 'getAll');
  if (entries) {
    console.log(`   Found ${entries.entries?.length || 0} entries`);
    console.log(`   Total: ${entries.total || 0}\n`);
  }

  const entryStats = await testEndpoint('entry', 'getStats');
  if (entryStats) {
    console.log(`   Total Entries: ${entryStats.total || 0}`);
    console.log(`   Total Fees: $${entryStats.totalFees || 0}\n`);
  }

  console.log('=' .repeat(60));
  console.log('✅ API Testing Complete\n');
}

runTests().catch(console.error);
