/**
 * Verify Test Competition and Routines are associated with tester tenant
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';
const TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

async function main() {
  console.log('🔍 Verifying test data association...\n');

  // Check competition
  const competition = await prisma.competitions.findUnique({
    where: { id: TEST_COMPETITION_ID },
    select: {
      id: true,
      name: true,
      tenant_id: true,
      tenants: {
        select: {
          subdomain: true,
          name: true,
        },
      },
    },
  });

  if (!competition) {
    console.log(`❌ Competition ${TEST_COMPETITION_ID} NOT FOUND`);
    return;
  }

  console.log('📊 Competition:');
  console.log(`   ID: ${competition.id}`);
  console.log(`   Name: ${competition.name}`);
  console.log(`   Tenant ID: ${competition.tenant_id}`);
  console.log(`   Tenant: ${competition.tenants.subdomain} (${competition.tenants.name})`);

  if (competition.tenant_id !== TEST_TENANT_ID) {
    console.log(`\n⚠️  MISMATCH! Competition tenant_id (${competition.tenant_id}) !== expected (${TEST_TENANT_ID})`);
    console.log(`   Competition belongs to: ${competition.tenants.subdomain}`);
  } else {
    console.log(`   ✅ Correct tenant`);
  }

  // Count routines
  const routineCount = await prisma.competition_entries.count({
    where: {
      competition_id: TEST_COMPETITION_ID,
    },
  });

  console.log(`\n📝 Routines: ${routineCount} total`);

  // Check routine tenant_ids
  const routineTenants = await prisma.competition_entries.groupBy({
    by: ['tenant_id'],
    where: {
      competition_id: TEST_COMPETITION_ID,
    },
    _count: true,
  });

  console.log('\n📊 Routines by tenant_id:');
  for (const group of routineTenants) {
    const tenant = await prisma.tenants.findUnique({
      where: { id: group.tenant_id },
      select: { subdomain: true },
    });
    console.log(`   ${tenant?.subdomain || 'unknown'} (${group.tenant_id}): ${group._count} routines`);

    if (group.tenant_id !== TEST_TENANT_ID) {
      console.log(`      ⚠️  WRONG TENANT!`);
    }
  }

  // Check for performance_date distribution
  const scheduled = await prisma.competition_entries.count({
    where: {
      competition_id: TEST_COMPETITION_ID,
      performance_date: { not: null },
    },
  });

  const unscheduled = await prisma.competition_entries.count({
    where: {
      competition_id: TEST_COMPETITION_ID,
      performance_date: null,
    },
  });

  console.log(`\n📅 Scheduling status:`);
  console.log(`   Unscheduled (performance_date IS NULL): ${unscheduled}`);
  console.log(`   Scheduled (performance_date IS NOT NULL): ${scheduled}`);
  console.log(`   Total: ${scheduled + unscheduled}`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
