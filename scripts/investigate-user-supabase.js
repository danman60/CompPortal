const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cafugvuaatsgihrsmvvl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZnVndnVhYXRzZ2locnNtdnZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1OTkzOSwiZXhwIjoyMDc0ODM1OTM5fQ.5t3eLm_ub1iY8pjkl5DF6Pu3e7-r8djNZpzKgHwKEsU'
);

async function investigate() {
  const email = 'dancefxstudio@yahoo.ca';
  console.log('=== INVESTIGATING USER:', email, '===\n');

  // Step 1: Check user_profiles
  console.log('1. Checking user_profiles...');
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    console.log('❌ User profile NOT FOUND');
    console.log('Error:', profileError?.message);
    return;
  }

  console.log('✅ User Profile Found:');
  console.log('   - user_id:', profile.user_id);
  console.log('   - email:', profile.email);
  console.log('   - role:', profile.role);
  console.log('   - tenant_id:', profile.tenant_id);
  console.log();

  // Step 2: Check studios
  console.log('2. Checking studios...');
  const { data: studios, error: studiosError } = await supabase
    .from('studios')
    .select('*')
    .eq('owner_id', profile.user_id);

  if (studiosError || !studios || studios.length === 0) {
    console.log('❌ No studios found for this user');
    console.log('Error:', studiosError?.message);
    return;
  }

  console.log(`✅ Found ${studios.length} studio(s):`);
  studios.forEach((studio, idx) => {
    console.log(`   Studio ${idx + 1}:`);
    console.log('   - id:', studio.id);
    console.log('   - name:', studio.name);
    console.log('   - status:', studio.status);
    console.log('   - tenant_id:', studio.tenant_id);
    console.log();
  });

  // Step 3: Check reservations
  console.log('3. Checking reservations...');
  const studioIds = studios.map(s => s.id);
  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select(`
      *,
      competition:competitions(name)
    `)
    .in('studio_id', studioIds);

  if (resError) {
    console.log('Error fetching reservations:', resError.message);
  }

  if (!reservations || reservations.length === 0) {
    console.log('❌ No reservations found');
    console.log('   → User CANNOT create routines without an approved reservation');
    return;
  }

  console.log(`✅ Found ${reservations.length} reservation(s):`);
  reservations.forEach((res, idx) => {
    console.log(`   Reservation ${idx + 1}:`);
    console.log('   - id:', res.id);
    console.log('   - competition:', res.competition?.name || 'N/A');
    console.log('   - status:', res.status);
    console.log('   - created_at:', res.created_at);
    console.log();
  });

  // Step 4: Check approved reservations
  const approvedReservations = reservations.filter(r => r.status === 'approved');
  console.log('4. Approved Reservations:');
  if (approvedReservations.length === 0) {
    console.log('❌ No APPROVED reservations found');
    console.log('   → User CANNOT create routines without an approved reservation');
    console.log('   → Current statuses:', reservations.map(r => r.status).join(', '));
  } else {
    console.log(`✅ ${approvedReservations.length} approved reservation(s) found`);
    console.log('   → User SHOULD be able to create routines');
  }
  console.log();

  // Step 5: Check entries
  console.log('5. Checking entries...');
  const { data: entries } = await supabase
    .from('entries')
    .select('id')
    .in('studio_id', studioIds);
  console.log(`   Found ${entries?.length || 0} total entries`);
  console.log();

  // Step 6: Summary
  console.log('=== SUMMARY ===');
  console.log('User exists: ✅');
  console.log('Role:', profile.role);
  console.log('Tenant:', profile.tenant_id);
  console.log('Has studio:', studios.length > 0 ? '✅' : '❌');
  console.log('Total reservations:', reservations.length);
  console.log('Approved reservations:', approvedReservations.length);
  console.log('Can create routines:', approvedReservations.length > 0 ? '✅ YES' : '❌ NO - Needs approved reservation');
}

investigate().catch(console.error);
