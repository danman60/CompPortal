/**
 * Populate Test Routines for Tester Tenant
 *
 * Creates additional routine entries to support production-scale testing.
 * ONLY affects tenant ending in 3 (tester tenant).
 *
 * Usage: node scripts/populate-test-routines.js --target 1000 --chunk-size 50
 */

// Load environment variables from .env
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// SAFETY: Only affect tester tenant
const TESTER_TENANT_ID = '00000000-0000-0000-0000-000000000003';

async function getCurrentRoutineCount() {
  const count = await prisma.competition_entries.count({
    where: { tenant_id: TESTER_TENANT_ID }
  });
  return count;
}

async function getExistingRoutineTemplate() {
  // Get a sample routine to copy structure from
  const sample = await prisma.competition_entries.findFirst({
    where: { tenant_id: TESTER_TENANT_ID },
    include: {
      competition: true,
      studio: true,
    }
  });

  if (!sample) {
    throw new Error('No existing routines found to template from');
  }

  return sample;
}

async function getStudiosAndDancers() {
  const studios = await prisma.studios.findMany({
    where: { tenant_id: TESTER_TENANT_ID },
    select: { id: true, name: true }
  });

  const dancers = await prisma.dancers.findMany({
    where: { tenant_id: TESTER_TENANT_ID },
    select: { id: true, first_name: true, last_name: true }
  });

  return { studios, dancers };
}

async function createRoutineChunk(template, studios, dancers, startIndex, chunkSize) {
  const routineNames = [
    'Aurora', 'Cascade', 'Eclipse', 'Phoenix', 'Radiance', 'Serenity', 'Titanium',
    'Velocity', 'Whisper', 'Zenith', 'Catalyst', 'Diamond', 'Emerald', 'Infinity',
    'Momentum', 'Odyssey', 'Prism', 'Quantum', 'Sanctuary', 'Transcendence',
    'Unity', 'Vortex', 'Wonderland', 'Genesis', 'Harmony', 'Luminous', 'Mystic',
    'Nebula', 'Enigma', 'Euphoria', 'Fire & Ice', 'Breakthrough', 'Metamorphosis',
    'Midnight Dreams', 'Crystal'
  ];

  const classes = ['Crystal', 'Sapphire', 'Emerald', 'Titanium', 'Production'];
  const sizes = ['Solo', 'Duet', 'Small Group', 'Large Group', 'Production'];
  const durations = [2, 3, 4];

  const routines = [];

  for (let i = 0; i < chunkSize; i++) {
    const routineNumber = startIndex + i + 1;
    const randomName = routineNames[Math.floor(Math.random() * routineNames.length)];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
    const randomDuration = durations[Math.floor(Math.random() * durations.length)];
    const randomAge = Math.floor(Math.random() * 15) + 5; // 5-19 years old
    const randomStudio = studios[Math.floor(Math.random() * studios.length)];

    routines.push({
      tenant_id: TESTER_TENANT_ID,
      competition_id: template.competition_id,
      studio_id: randomStudio.id,
      reservation_id: template.reservation_id,
      routine_name: `${randomName} ${routineNumber}`,
      routine_class: randomClass,
      routine_size: randomSize,
      routine_category: 'X', // Same as template
      routine_age_category: randomAge,
      duration_minutes: randomDuration,
      status: 'approved',
      is_scheduled: false,
      entry_number: null,
      performance_date: null,
      performance_time: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // Insert in transaction
  const created = await prisma.competition_entries.createMany({
    data: routines,
    skipDuplicates: true,
  });

  return created.count;
}

async function populateRoutines(targetCount, chunkSize = 50) {
  try {
    console.log(`🎯 Target: ${targetCount} routines`);
    console.log(`📦 Chunk size: ${chunkSize} routines per batch`);
    console.log(`🔐 Tenant: ${TESTER_TENANT_ID} (tester only)\n`);

    // Get current count
    const currentCount = await getCurrentRoutineCount();
    console.log(`📊 Current routines: ${currentCount}`);

    if (currentCount >= targetCount) {
      console.log(`✅ Already at target! No need to create more.`);
      return;
    }

    const needed = targetCount - currentCount;
    console.log(`🚀 Need to create: ${needed} routines\n`);

    // Get template data
    console.log('📋 Loading template data...');
    const template = await getExistingRoutineTemplate();
    const { studios, dancers } = await getStudiosAndDancers();
    console.log(`   Found ${studios.length} studios, ${dancers.length} dancers\n`);

    // Create in chunks
    let created = 0;
    const totalChunks = Math.ceil(needed / chunkSize);

    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const currentChunkSize = Math.min(chunkSize, needed - created);
      const startIndex = currentCount + created;

      console.log(`📦 Chunk ${chunk + 1}/${totalChunks}: Creating ${currentChunkSize} routines...`);

      const chunkCreated = await createRoutineChunk(
        template,
        studios,
        dancers,
        startIndex,
        currentChunkSize
      );

      created += chunkCreated;
      const newTotal = currentCount + created;

      console.log(`   ✅ Created ${chunkCreated} routines (Total: ${newTotal}/${targetCount})\n`);

      // Brief pause between chunks to avoid overwhelming the DB
      if (chunk < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n🎉 SUCCESS! Created ${created} routines`);
    console.log(`📊 Final count: ${currentCount + created} routines`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const targetIndex = args.indexOf('--target');
const chunkIndex = args.indexOf('--chunk-size');

const targetCount = targetIndex >= 0 ? parseInt(args[targetIndex + 1]) : 1000;
const chunkSize = chunkIndex >= 0 ? parseInt(args[chunkIndex + 1]) : 50;

// Run
populateRoutines(targetCount, chunkSize)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
