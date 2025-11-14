/**
 * Create Tester Tenant
 * SAFE: Only creates if not exists, does NOT affect EMPWR or Glow
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking existing tenants...\n');

  // Verify EMPWR and Glow are safe
  const prodTenants = await prisma.tenants.findMany({
    where: {
      subdomain: {
        in: ['empwr', 'glow'],
      },
    },
    select: {
      id: true,
      subdomain: true,
      name: true,
    },
  });

  console.log('✅ Production tenants verified:');
  prodTenants.forEach(t => console.log(`   - ${t.subdomain}: ${t.name} (${t.id})`));
  console.log('');

  // Check if tester tenant exists
  const existingTester = await prisma.tenants.findFirst({
    where: {
      OR: [
        { id: '00000000-0000-0000-0000-000000000003' },
        { subdomain: 'tester' },
      ],
    },
  });

  if (existingTester) {
    console.log('ℹ️  Tester tenant already exists:');
    console.log(`   ID: ${existingTester.id}`);
    console.log(`   Subdomain: ${existingTester.subdomain}`);
    console.log(`   Name: ${existingTester.name}`);
    console.log('\n✅ No action needed.');
    return;
  }

  // Create tester tenant
  console.log('📝 Creating tester tenant...\n');

  const testerTenant = await prisma.tenants.create({
    data: {
      id: '00000000-0000-0000-0000-000000000003',
      subdomain: 'tester',
      slug: 'test',
      name: 'Test Environment',
      branding: {},
    },
  });

  console.log('✅ Tester tenant created successfully:');
  console.log(`   ID: ${testerTenant.id}`);
  console.log(`   Subdomain: ${testerTenant.subdomain}`);
  console.log(`   Name: ${testerTenant.name}`);
  console.log('');

  // Verify all tenants
  const allTenants = await prisma.tenants.findMany({
    select: {
      subdomain: true,
      name: true,
      _count: {
        select: {
          competitions: true,
        },
      },
    },
    orderBy: {
      subdomain: 'asc',
    },
  });

  console.log('📊 All tenants:');
  allTenants.forEach(t => {
    console.log(`   - ${t.subdomain}: ${t.name} (${t._count.competitions} competitions)`);
  });
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
