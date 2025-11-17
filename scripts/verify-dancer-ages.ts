/**
 * Dancer Age Verification Script
 *
 * Queries database for dancers and calculates their age as of Dec 31, 2025
 * to verify the age calculation logic matches what's displayed on entry forms
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseISODateToUTC(isoString: string): Date {
  const [year, month, day] = isoString.split('T')[0].split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function calculateAgeAsOfDecember31(dateOfBirth: string, year: number): number {
  const dob = parseISODateToUTC(dateOfBirth);
  const dec31 = new Date(Date.UTC(year, 11, 31)); // Dec 31 of the year

  let age = dec31.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = dec31.getUTCMonth() - dob.getUTCMonth();

  // Adjust if birthday hasn't occurred yet by Dec 31
  if (monthDiff < 0 || (monthDiff === 0 && dec31.getUTCDate() < dob.getUTCDate())) {
    age--;
  }

  return age;
}

async function verifyDancerAges() {
  console.log('🔍 Dancer Age Verification - As of Dec 31, 2025\n');
  console.log('=' .repeat(80));

  try {
    // Set tenant context for RLS (Row Level Security)
    const tenantId = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';
    await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}::text, false)`;

    // Query 30 dancers with DOB from the database
    const dancers = await prisma.dancers.findMany({
      where: {
        date_of_birth: {
          not: null
        }
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        date_of_birth: true,
        studio_id: true
      },
      take: 30,
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`\nFound ${dancers.length} dancers with date_of_birth\n`);

    dancers.forEach((dancer, index) => {
      if (!dancer.date_of_birth) return;

      const dobString = dancer.date_of_birth instanceof Date
        ? dancer.date_of_birth.toISOString()
        : dancer.date_of_birth;
      const age = calculateAgeAsOfDecember31(dobString, 2025);
      const dob = dobString.split('T')[0]; // ISO date format

      console.log(`${(index + 1).toString().padStart(2, '0')}. ${dancer.first_name} ${dancer.last_name}`);
      console.log(`    DOB: ${dob} → Age as of Dec 31, 2025: ${age} years old`);
      console.log(`    ID: ${dancer.id.substring(0, 8)}...`);
      console.log('');
    });

    console.log('=' .repeat(80));
    console.log('\n✅ Verification complete. Compare these ages against the entry form display.\n');

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDancerAges();
