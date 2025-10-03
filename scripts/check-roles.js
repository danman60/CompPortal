const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.user_profiles.findMany({
    select: {
      role: true,
      first_name: true,
      last_name: true,
    }
  });

  console.log('Existing user profiles and roles:');
  console.table(profiles);

  const roleCounts = profiles.reduce((acc, profile) => {
    const role = profile.role || 'null';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  console.log('\nRole distribution:');
  console.table(roleCounts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
