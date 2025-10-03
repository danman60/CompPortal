const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'add-user-roles.sql'), 'utf-8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 60)}...`);
    try {
      const result = await prisma.$executeRawUnsafe(statement);
      console.log(`✓ Success\n`);
    } catch (error) {
      console.error(`✗ Error: ${error.message}\n`);
    }
  }

  // Verify the migration
  const profiles = await prisma.$queryRaw`
    SELECT role, COUNT(*) as count
    FROM public.user_profiles
    GROUP BY role
  `;

  console.log('Final role distribution:');
  console.table(profiles);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
