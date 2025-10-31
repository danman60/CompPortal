const { createClient } = require('@supabase/supabase-js');

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateMasterCSV() {
  console.log('=== CREATING MASTER CSV FROM DATABASE ===\n');

  // Get all approved reservations for both tenants
  const { data: glowReservations, error: glowError } = await supabase
    .from('reservations')
    .select(`
      studio:studios(name, email, tenant_id),
      competition:competitions(name),
      spaces_requested,
      spaces_confirmed,
      status
    `)
    .eq('status', 'approved')
    .eq('studios.tenant_id', '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5')
    .order('studios(name)');

  if (glowError) {
    console.error('ERROR fetching Glow reservations:', glowError);
    process.exit(1);
  }

  const { data: empwrReservations, error: empwrError } = await supabase
    .from('reservations')
    .select(`
      studio:studios(name, email, tenant_id),
      competition:competitions(name),
      spaces_requested,
      spaces_confirmed,
      status
    `)
    .eq('status', 'approved')
    .eq('studios.tenant_id', '00000000-0000-0000-0000-000000000001')
    .order('studios(name)');

  if (empwrError) {
    console.error('ERROR fetching EMPWR reservations:', empwrError);
    process.exit(1);
  }

  console.log(`✅ Fetched ${glowReservations.length} Glow reservations`);
  console.log(`✅ Fetched ${empwrReservations.length} EMPWR reservations\n`);

  // Aggregate by studio
  const studioMap = new Map();

  function processReservations(reservations, tenant, tenantId) {
    reservations.forEach(r => {
      const studioName = r.studio.name;
      const key = `${tenant}_${studioName}`;

      if (!studioMap.has(key)) {
        studioMap.set(key, {
          tenant,
          tenant_id: tenantId,
          studio_name: studioName,
          email: r.studio.email || '',
          competitions: [],
          total_spaces: 0,
        });
      }

      const studio = studioMap.get(key);
      studio.competitions.push({
        name: r.competition.name,
        spaces_confirmed: r.spaces_confirmed,
      });
      studio.total_spaces += r.spaces_confirmed || 0;
    });
  }

  processReservations(glowReservations, 'Glow', '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5');
  processReservations(empwrReservations, 'EMPWR', '00000000-0000-0000-0000-000000000001');

  console.log(`✅ Aggregated ${studioMap.size} unique studios\n`);

  // Generate CSV rows
  const csvRows = [];

  // Header
  csvRows.push([
    'Tenant',
    'Tenant_ID',
    'Studio_Name',
    'Email',
    'Total_Spaces',
    'Competition_1',
    'Spaces_1',
    'Competition_2',
    'Spaces_2',
    'Competition_3',
    'Spaces_3',
    'Competition_4',
    'Spaces_4',
    'Has_Email',
    'Ready_For_Invitation',
  ].join(','));

  // Data rows
  studioMap.forEach((studio) => {
    const hasEmail = studio.email ? 'YES' : 'NO';
    const readyForInvitation = studio.email ? 'YES' : 'NO';

    const row = [
      studio.tenant,
      studio.tenant_id,
      `"${studio.studio_name.replace(/"/g, '""')}"`,
      studio.email ? `"${studio.email.replace(/"/g, '""')}"` : '',
      studio.total_spaces,
    ];

    // Add up to 4 competitions
    for (let i = 0; i < 4; i++) {
      if (studio.competitions[i]) {
        row.push(`"${studio.competitions[i].name.replace(/"/g, '""')}"`);
        row.push(studio.competitions[i].spaces_confirmed);
      } else {
        row.push('');
        row.push('');
      }
    }

    row.push(hasEmail);
    row.push(readyForInvitation);

    csvRows.push(row.join(','));
  });

  // Write CSV
  const fs = require('fs');
  const path = require('path');
  const csvContent = csvRows.join('\n');
  const outputPath = path.join(__dirname, '..', 'MASTER_STUDIO_DATA_FROM_DB.csv');
  fs.writeFileSync(outputPath, csvContent, 'utf8');

  console.log(`✅ Master CSV created: ${outputPath}\n`);

  // Generate summary
  let glowStudios = 0;
  let glowWithEmail = 0;
  let glowTotalSpaces = 0;

  let empwrStudios = 0;
  let empwrWithEmail = 0;
  let empwrTotalSpaces = 0;

  studioMap.forEach((studio) => {
    if (studio.tenant === 'Glow') {
      glowStudios++;
      if (studio.email) glowWithEmail++;
      glowTotalSpaces += studio.total_spaces;
    } else {
      empwrStudios++;
      if (studio.email) empwrWithEmail++;
      empwrTotalSpaces += studio.total_spaces;
    }
  });

  console.log('=== SUMMARY ===\n');
  console.log('GLOW TENANT:');
  console.log(`  Studios: ${glowStudios}`);
  console.log(`  With Email: ${glowWithEmail} (${Math.round(glowWithEmail/glowStudios*100)}%)`);
  console.log(`  Without Email: ${glowStudios - glowWithEmail}`);
  console.log(`  Total Spaces Confirmed: ${glowTotalSpaces}`);
  console.log('');

  console.log('EMPWR TENANT:');
  console.log(`  Studios: ${empwrStudios}`);
  console.log(`  With Email: ${empwrWithEmail} (${empwrWithEmail > 0 ? Math.round(empwrWithEmail/empwrStudios*100) : 0}%)`);
  console.log(`  Without Email: ${empwrStudios - empwrWithEmail}`);
  console.log(`  Total Spaces Confirmed: ${empwrTotalSpaces}`);
  console.log('');

  console.log('OVERALL:');
  console.log(`  Total Studios: ${glowStudios + empwrStudios}`);
  console.log(`  Ready for Invitation: ${glowWithEmail + empwrWithEmail}`);
  console.log(`  Need Email: ${(glowStudios - glowWithEmail) + (empwrStudios - empwrWithEmail)}`);
  console.log(`  Total Spaces: ${glowTotalSpaces + empwrTotalSpaces}`);
  console.log('');

  // List studios missing emails
  console.log('=== STUDIOS MISSING EMAILS ===\n');

  console.log('GLOW:');
  studioMap.forEach((studio) => {
    if (studio.tenant === 'Glow' && !studio.email) {
      console.log(`  - ${studio.studio_name} (${studio.total_spaces} spaces)`);
    }
  });

  console.log('\nEMPWR:');
  studioMap.forEach((studio) => {
    if (studio.tenant === 'EMPWR' && !studio.email) {
      console.log(`  - ${studio.studio_name} (${studio.total_spaces} spaces)`);
    }
  });

  console.log('\n✅ Master CSV generation complete!');
  console.log(`📄 File: ${outputPath}`);
}

generateMasterCSV().catch(console.error);
