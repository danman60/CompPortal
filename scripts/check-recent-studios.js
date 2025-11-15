const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Get studios ordered by updated_at DESC
    const studios = await prisma.studios.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        updated_at: true,
        created_at: true,
      },
      orderBy: {
        updated_at: 'desc'
      },
      take: 10
    });

    console.log('\n=== Recently Updated Studios (Top 10) ===\n');
    studios.forEach((studio, index) => {
      const updatedAt = studio.updated_at ? new Date(studio.updated_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A';
      const createdAt = studio.created_at ? new Date(studio.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A';

      console.log(`${index + 1}. ${studio.name}`);
      console.log(`   Email: ${studio.email || 'No email'}`);
      console.log(`   Updated: ${updatedAt}`);
      console.log(`   Created: ${createdAt}`);
      console.log(`   ID: ${studio.id}`);
      console.log('');
    });

    // Also check activity logs for email updates
    const activityLogs = await prisma.activity_logs.findMany({
      where: {
        entity_type: 'studio',
        action: {
          contains: 'update'
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5,
      select: {
        id: true,
        action: true,
        entity_name: true,
        details: true,
        created_at: true,
      }
    });

    if (activityLogs.length > 0) {
      console.log('\n=== Recent Studio Activity Logs ===\n');
      activityLogs.forEach((log, index) => {
        const timestamp = new Date(log.created_at).toLocaleString('en-US', { timeZone: 'America/New_York' });
        console.log(`${index + 1}. ${log.action} - ${log.entity_name}`);
        console.log(`   Time: ${timestamp}`);
        console.log(`   Details: ${log.details || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
