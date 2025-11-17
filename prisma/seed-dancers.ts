import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

// Test competition ID (from tester environment)
const TEST_COMPETITION_ID = '10000000-0000-0000-0000-000000000001';

// Dancer names for realistic test data
const FIRST_NAMES = [
  'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia',
  'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn',
  'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Avery',
  'Ella', 'Scarlett', 'Grace', 'Chloe', 'Victoria',
  'Riley', 'Aria', 'Lily', 'Aubrey', 'Zoey',
  'Penelope', 'Lillian', 'Addison', 'Layla', 'Natalie',
  'Camila', 'Hannah', 'Brooklyn', 'Zoe', 'Nora',
  'Leah', 'Savannah', 'Audrey', 'Claire', 'Eleanor',
  'Skylar', 'Ellie', 'Samantha', 'Stella', 'Paisley',
  'Violet', 'Mila', 'Allison', 'Alexa', 'Anna'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Thompson', 'White', 'Harris', 'Clark',
  'Lewis', 'Robinson', 'Walker', 'Young', 'Hall',
  'Allen', 'King', 'Wright', 'Scott', 'Green',
  'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell',
  'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell',
  'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart'
];

// Age groups mapping
const AGE_GROUPS = [
  { id: '10000000-0000-0000-0000-000000000010', name: 'Mini', count: 12 },
  { id: '10000000-0000-0000-0000-000000000011', name: 'Junior', count: 18 },
  { id: '10000000-0000-0000-0000-000000000012', name: 'Teen', count: 12 },
  { id: '10000000-0000-0000-0000-000000000013', name: 'Senior', count: 8 },
];

async function main() {
  console.log('🌱 Starting dancer and routine participant seeding...');

  // Get studios
  const studios = await prisma.studios.findMany({
    where: {
      OR: [
        { name: 'Elite Performing Arts' },
        { name: 'Dance Expressions' },
        { name: 'Starlight Dance Academy' }
      ]
    },
    take: 3
  });

  if (studios.length === 0) {
    console.log('❌ No studios found. Please run seed-test-data.ts first.');
    return;
  }

  console.log(`✅ Found ${studios.length} studios`);

  // Get routines
  const routines = await prisma.routines.findMany({
    where: { competition_id: TEST_COMPETITION_ID },
    include: {
      entry_sizes: true,
      age_groups: true,
    }
  });

  if (routines.length === 0) {
    console.log('❌ No routines found. Cannot seed dancers.');
    return;
  }

  console.log(`✅ Found ${routines.length} routines`);

  // Create dancers distributed across studios and age groups
  console.log('\n👥 Creating 50 dancers...');
  const dancers: any[] = [];
  let dancerIndex = 0;

  for (const ageGroup of AGE_GROUPS) {
    for (let i = 0; i < ageGroup.count; i++) {
      const studio = studios[dancerIndex % studios.length];
      const firstName = FIRST_NAMES[dancerIndex % FIRST_NAMES.length];
      const lastName = LAST_NAMES[dancerIndex % LAST_NAMES.length];

      const dancer = await prisma.dancers.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          studio_id: studio.id,
          competition_id: TEST_COMPETITION_ID,
          age_group_id: ageGroup.id,
          status: 'active'
        }
      });

      dancers.push({ ...dancer, ageGroupName: ageGroup.name });
      console.log(`  ✓ ${firstName} ${lastName} (${ageGroup.name}) - ${studio.name}`);
      dancerIndex++;
    }
  }

  console.log(`\n✅ Created ${dancers.length} dancers`);

  // Assign dancers to routines based on entry size and age group
  console.log('\n🔗 Assigning dancers to routines...');

  for (const routine of routines) {
    const entrySizeName = routine.entry_sizes?.name || '';
    const ageGroupName = routine.age_groups?.name || '';

    // Determine number of dancers needed
    let dancerCount = 1; // Default to solo
    if (entrySizeName.includes('Duet')) dancerCount = 2;
    else if (entrySizeName.includes('Trio')) dancerCount = 3;
    else if (entrySizeName.includes('Small Group')) dancerCount = 5;
    else if (entrySizeName.includes('Large Group')) dancerCount = 8;
    else if (entrySizeName.includes('Line')) dancerCount = 10;
    else if (entrySizeName.includes('Production')) dancerCount = 15;

    // Find dancers matching the routine's age group
    const eligibleDancers = dancers.filter(d => d.ageGroupName === ageGroupName);

    if (eligibleDancers.length === 0) {
      console.log(`  ⚠️  No dancers for ${routine.title} (${ageGroupName})`);
      continue;
    }

    // Randomly select dancers (with potential for conflicts)
    const selectedDancers = [];
    for (let i = 0; i < Math.min(dancerCount, eligibleDancers.length); i++) {
      const randomIndex = Math.floor(Math.random() * eligibleDancers.length);
      selectedDancers.push(eligibleDancers[randomIndex]);
    }

    // Create routine_participants
    for (const dancer of selectedDancers) {
      await prisma.routine_participants.create({
        data: {
          routine_id: routine.id,
          dancer_id: dancer.id,
        }
      });
    }

    console.log(`  ✓ ${routine.title}: ${selectedDancers.length} dancers (${entrySizeName})`);
  }

  // Create intentional conflicts for testing
  console.log('\n⚠️  Creating intentional conflicts for testing...');

  // Find 5 active dancers from different age groups
  const conflictDancers = [
    dancers.find(d => d.ageGroupName === 'Mini'),
    dancers.find(d => d.ageGroupName === 'Junior'),
    dancers.find(d => d.ageGroupName === 'Teen'),
  ].filter(Boolean);

  for (const dancer of conflictDancers) {
    // Find routines with this dancer's age group
    const matchingRoutines = routines.filter(r =>
      r.age_groups?.name === dancer.ageGroupName
    );

    if (matchingRoutines.length >= 3) {
      // Add this dancer to 3 routines that are close together
      // (assuming routines are already scheduled sequentially)
      const selectedRoutines = matchingRoutines.slice(0, 3);

      for (const routine of selectedRoutines) {
        // Check if dancer is already in this routine
        const existing = await prisma.routine_participants.findFirst({
          where: {
            routine_id: routine.id,
            dancer_id: dancer.id,
          }
        });

        if (!existing) {
          await prisma.routine_participants.create({
            data: {
              routine_id: routine.id,
              dancer_id: dancer.id,
            }
          });
        }
      }

      console.log(`  ✓ ${dancer.first_name} ${dancer.last_name}: added to 3 consecutive routines (conflict)`);
    }
  }

  // Summary
  console.log('\n\n📊 Seeding Summary:');
  console.log('═══════════════════════════════════════');

  const totalDancers = await prisma.dancers.count({
    where: { competition_id: TEST_COMPETITION_ID }
  });

  const totalParticipants = await prisma.routine_participants.count({
    where: {
      routines: { competition_id: TEST_COMPETITION_ID }
    }
  });

  const routinesWithDancers = await prisma.routines.count({
    where: {
      competition_id: TEST_COMPETITION_ID,
      routine_participants: {
        some: {}
      }
    }
  });

  console.log(`✅ Total Dancers: ${totalDancers}`);
  console.log(`✅ Total Routine Participants: ${totalParticipants}`);
  console.log(`✅ Routines with Dancers: ${routinesWithDancers}/${routines.length}`);
  console.log('\n✨ Seeding complete! Test data ready for conflict detection testing.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding dancers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
