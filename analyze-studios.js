const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeStudios() {
  const { data: studios, error } = await supabase
    .from('studios')
    .select(`
      id,
      name,
      email,
      status,
      owner_id,
      tenants!inner(subdomain, name)
    `)
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== STUDIO EMAIL ANALYSIS ===\n');

  const byTenant = { empwr: [], glow: [] };
  const issues = {
    missing: [],
    multiple: [],
    unclaimed: []
  };

  studios.forEach(studio => {
    const tenant = studio.tenants.subdomain;
    const claimStatus = studio.owner_id ? 'CLAIMED' : 'UNCLAIMED';

    let emailStatus = 'OK';
    if (!studio.email) {
      emailStatus = 'MISSING';
      issues.missing.push(studio);
    } else {
      const atCount = (studio.email.match(/@/g) || []).length;
      if (atCount > 1 || studio.email.includes(',') || studio.email.includes(';')) {
        emailStatus = 'MULTIPLE';
        issues.multiple.push(studio);
      }
    }

    if (!studio.owner_id) {
      issues.unclaimed.push(studio);
    }

    const line = `[${tenant.toUpperCase().padEnd(5)}] ${studio.name.padEnd(45)} | ${emailStatus.padEnd(10)} | ${claimStatus.padEnd(10)} | ${studio.email || 'NO EMAIL'}`;
    console.log(line);

    byTenant[tenant].push(studio);
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Total Studios: ${studios.length}`);
  console.log(`  EMPWR: ${byTenant.empwr.length}`);
  console.log(`  GLOW: ${byTenant.glow.length}`);
  console.log(`Missing Email: ${issues.missing.length}`);
  console.log(`Multiple Emails: ${issues.multiple.length}`);
  console.log(`Unclaimed: ${issues.unclaimed.length}`);

  if (issues.multiple.length > 0) {
    console.log('\n=== STUDIOS WITH MULTIPLE EMAILS ===');
    issues.multiple.forEach(s => {
      console.log(`[${s.tenants.subdomain.toUpperCase()}] ${s.name}:`);
      console.log(`  ${s.email}`);
    });
  }

  if (issues.missing.length > 0) {
    console.log('\n=== STUDIOS MISSING EMAILS ===');
    issues.missing.forEach(s => {
      console.log(`[${s.tenants.subdomain.toUpperCase()}] ${s.name}`);
    });
  }

  console.log('\n=== POTENTIAL DUPLICATES (Similar Names) ===');
  let dupsFound = false;

  for (let i = 0; i < studios.length; i++) {
    for (let j = i + 1; j < studios.length; j++) {
      const s1 = studios[i];
      const s2 = studios[j];

      if (s1.tenants.subdomain !== s2.tenants.subdomain) continue;

      const name1 = s1.name.toLowerCase().replace(/[^a-z]/g, '');
      const name2 = s2.name.toLowerCase().replace(/[^a-z]/g, '');

      if (name1 === name2 || (name1.includes(name2) || name2.includes(name1))) {
        dupsFound = true;
        console.log(`[${s1.tenants.subdomain.toUpperCase()}] Potential duplicates:`);
        console.log(`  1. ${s1.name} | ${s1.email || 'NO EMAIL'} | ${s1.status}`);
        console.log(`  2. ${s2.name} | ${s2.email || 'NO EMAIL'} | ${s2.status}`);
        console.log('');
      }
    }
  }

  if (!dupsFound) {
    console.log('No potential duplicates found.');
  }
}

analyzeStudios().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
