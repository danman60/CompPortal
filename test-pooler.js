const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('Testing pooler connection...');

prisma.studios.count()
  .then(result => {
    console.log('✅ Connection works! Studio count:', result);
    return prisma.$disconnect();
  })
  .catch(error => {
    console.error('❌ Connection failed:', error.message);
    return prisma.$disconnect();
  })
  .finally(() => {
    process.exit(0);
  });
