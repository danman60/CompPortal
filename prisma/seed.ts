import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (optional - comment out if you want to keep existing data)
  console.log('📝 Cleaning existing test data...');

  // Create lookup tables first
  console.log('📚 Creating categories...');
  const soloCategory = await prisma.categories.upsert({
    where: { name: 'Solo' },
    update: {},
    create: {
      name: 'Solo',
      description: 'Individual performance',
      min_performers: 1,
      max_performers: 1,
    },
  });

  const duoCategory = await prisma.categories.upsert({
    where: { name: 'Duo/Trio' },
    update: {},
    create: {
      name: 'Duo/Trio',
      description: 'Performance with 2-3 dancers',
      min_performers: 2,
      max_performers: 3,
    },
  });

  const groupCategory = await prisma.categories.upsert({
    where: { name: 'Small Group' },
    update: {},
    create: {
      name: 'Small Group',
      description: 'Performance with 4-9 dancers',
      min_performers: 4,
      max_performers: 9,
    },
  });

  console.log('📊 Creating age groups...');
  const petiteAge = await prisma.age_groups.upsert({
    where: { group_name: 'Petite' },
    update: {},
    create: {
      group_name: 'Petite',
      min_age: 5,
      max_age: 8,
      description: 'Ages 5-8',
    },
  });

  const juniorAge = await prisma.age_groups.upsert({
    where: { group_name: 'Junior' },
    update: {},
    create: {
      group_name: 'Junior',
      min_age: 9,
      max_age: 11,
      description: 'Ages 9-11',
    },
  });

  const teenAge = await prisma.age_groups.upsert({
    where: { group_name: 'Teen' },
    update: {},
    create: {
      group_name: 'Teen',
      min_age: 12,
      max_age: 14,
      description: 'Ages 12-14',
    },
  });

  console.log('🎯 Creating classifications...');
  const recreationalClass = await prisma.classifications.upsert({
    where: { name: 'Recreational' },
    update: {},
    create: {
      name: 'Recreational',
      description: 'For fun and enjoyment',
      skill_level: 'beginner',
    },
  });

  const competitiveClass = await prisma.classifications.upsert({
    where: { name: 'Competitive' },
    update: {},
    create: {
      name: 'Competitive',
      description: 'Competitive level dancers',
      skill_level: 'intermediate',
    },
  });

  const eliteClass = await prisma.classifications.upsert({
    where: { name: 'Elite' },
    update: {},
    create: {
      name: 'Elite',
      description: 'Highest competitive level',
      skill_level: 'advanced',
    },
  });

  console.log('📏 Creating entry size categories...');
  const soloSize = await prisma.entry_size_categories.upsert({
    where: { size_name: 'Solo' },
    update: {},
    create: {
      size_name: 'Solo',
      min_performers: 1,
      max_performers: 1,
    },
  });

  const duoSize = await prisma.entry_size_categories.upsert({
    where: { size_name: 'Duo/Trio' },
    update: {},
    create: {
      size_name: 'Duo/Trio',
      min_performers: 2,
      max_performers: 3,
    },
  });

  const smallGroupSize = await prisma.entry_size_categories.upsert({
    where: { size_name: 'Small Group' },
    update: {},
    create: {
      size_name: 'Small Group',
      min_performers: 4,
      max_performers: 9,
    },
  });

  // Create test studios
  console.log('🏢 Creating test studios...');
  const studio1 = await prisma.studios.create({
    data: {
      name: 'Starlight Dance Academy',
      code: 'SDA',
      owner_id: '00000000-0000-0000-0000-000000000000',
      email: 'info@starlightdance.com',
      phone: '604-555-0100',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      status: 'approved',
    },
  });

  const studio2 = await prisma.studios.create({
    data: {
      name: 'Elite Performance Studio',
      code: 'EPS',
      owner_id: '00000000-0000-0000-0000-000000000000',
      email: 'contact@eliteperformance.com',
      phone: '604-555-0200',
      city: 'Burnaby',
      province: 'BC',
      country: 'Canada',
      status: 'approved',
    },
  });

  const studio3 = await prisma.studios.create({
    data: {
      name: 'Rhythm & Motion Dance',
      code: 'RMD',
      owner_id: '00000000-0000-0000-0000-000000000000',
      email: 'hello@rhythmmotion.com',
      phone: '604-555-0300',
      city: 'Surrey',
      province: 'BC',
      country: 'Canada',
      status: 'pending',
    },
  });

  // Create test competition
  console.log('🏆 Creating test competition...');
  const competition = await prisma.competitions.create({
    data: {
      name: 'GlowDance Championship 2025',
      year: 2025,
      description: 'Annual GlowDance competition featuring elite performances',
      registration_opens: new Date('2025-03-01'),
      registration_closes: new Date('2025-05-15'),
      competition_start_date: new Date('2025-06-20'),
      competition_end_date: new Date('2025-06-25'),
      primary_location: 'Vancouver Convention Centre',
      venue_address: '1055 Canada Place, Vancouver, BC V6C 0C3',
      venue_capacity: 600,
      session_count: 3,
      number_of_judges: 5,
      entry_fee: '75.00',
      late_fee: '25.00',
      status: 'registration_open',
      is_public: true,
      contact_email: 'info@glowdance.com',
      contact_phone: '604-555-GLOW',
    },
  });

  // Create test dancers
  console.log('👯 Creating test dancers...');
  const dancers = [];

  for (let i = 0; i < 15; i++) {
    const studioId = i < 5 ? studio1.id : i < 10 ? studio2.id : studio3.id;
    const age = 8 + (i % 8);
    const dancer = await prisma.dancers.create({
      data: {
        studio_id: studioId,
        first_name: `Dancer${i + 1}`,
        last_name: `Test${i + 1}`,
        date_of_birth: new Date(`${2025 - age}-06-15`),
        gender: i % 2 === 0 ? 'Female' : 'Male',
        email: `dancer${i + 1}@test.com`,
        phone: `604-555-${1000 + i}`,
        parent_name: `Parent ${i + 1}`,
        parent_email: `parent${i + 1}@test.com`,
        parent_phone: `604-555-${2000 + i}`,
        years_dancing: Math.min(age - 3, 10),
        primary_style: ['Ballet', 'Jazz', 'Contemporary', 'Hip Hop', 'Tap'][i % 5],
        skill_level: ['beginner', 'intermediate', 'advanced'][i % 3],
        previous_competitions: i % 5,
        waiver_signed: true,
        status: 'active',
      },
    });
    dancers.push(dancer);
  }

  // Create test reservations
  console.log('📋 Creating test reservations...');
  const reservation1 = await prisma.reservations.create({
    data: {
      studio_id: studio1.id,
      competition_id: competition.id,
      spaces_requested: 20,
      spaces_confirmed: 20,
      agent_first_name: 'Sarah',
      agent_last_name: 'Johnson',
      agent_email: 'sarah@starlightdance.com',
      agent_phone: '604-555-0101',
      age_of_consent: true,
      waiver_consent: true,
      media_consent: true,
      deposit_amount: '500.00',
      total_amount: '1500.00',
      payment_status: 'paid',
      status: 'approved',
      approved_at: new Date(),
    },
  });

  const reservation2 = await prisma.reservations.create({
    data: {
      studio_id: studio2.id,
      competition_id: competition.id,
      spaces_requested: 15,
      spaces_confirmed: 15,
      agent_first_name: 'Michael',
      agent_last_name: 'Chen',
      agent_email: 'michael@eliteperformance.com',
      agent_phone: '604-555-0201',
      age_of_consent: true,
      waiver_consent: true,
      media_consent: true,
      deposit_amount: '400.00',
      total_amount: '1125.00',
      payment_status: 'partial',
      status: 'approved',
      approved_at: new Date(),
    },
  });

  const reservation3 = await prisma.reservations.create({
    data: {
      studio_id: studio3.id,
      competition_id: competition.id,
      spaces_requested: 10,
      agent_first_name: 'Emily',
      agent_last_name: 'Rodriguez',
      agent_email: 'emily@rhythmmotion.com',
      agent_phone: '604-555-0301',
      age_of_consent: true,
      waiver_consent: false,
      media_consent: true,
      payment_status: 'pending',
      status: 'pending',
    },
  });

  // Create test competition entries
  console.log('🎭 Creating test competition entries...');

  // Solo entries
  for (let i = 0; i < 5; i++) {
    const dancer = dancers[i];
    await prisma.competition_entries.create({
      data: {
        competition_id: competition.id,
        reservation_id: reservation1.id,
        studio_id: studio1.id,
        title: `${dancer.primary_style} Solo ${i + 1}`,
        category_id: soloCategory.id,
        classification_id: competitiveClass.id,
        age_group_id: petiteAge.id,
        entry_size_category_id: soloSize.id,
        music_title: `Dance Track ${i + 1}`,
        music_artist: `Artist ${i + 1}`,
        choreographer: 'Sarah Johnson',
        entry_fee: '75.00',
        late_fee: '0.00',
        total_fee: '75.00',
        status: 'registered',
        entry_participants: {
          create: {
            dancer_id: dancer.id,
            dancer_name: `${dancer.first_name} ${dancer.last_name}`,
            dancer_age: 2025 - new Date(dancer.date_of_birth || '').getFullYear(),
            display_order: 1,
          },
        },
      },
    });
  }

  // Duo entries
  for (let i = 0; i < 3; i++) {
    const dancer1 = dancers[i + 5];
    const dancer2 = dancers[i + 6];
    await prisma.competition_entries.create({
      data: {
        competition_id: competition.id,
        reservation_id: reservation2.id,
        studio_id: studio2.id,
        title: `Dynamic Duo ${i + 1}`,
        category_id: duoCategory.id,
        classification_id: eliteClass.id,
        age_group_id: juniorAge.id,
        entry_size_category_id: duoSize.id,
        music_title: `Duet Track ${i + 1}`,
        choreographer: 'Michael Chen',
        entry_fee: '150.00',
        total_fee: '150.00',
        status: 'confirmed',
        entry_participants: {
          create: [
            {
              dancer_id: dancer1.id,
              dancer_name: `${dancer1.first_name} ${dancer1.last_name}`,
              dancer_age: 2025 - new Date(dancer1.date_of_birth || '').getFullYear(),
              display_order: 1,
            },
            {
              dancer_id: dancer2.id,
              dancer_name: `${dancer2.first_name} ${dancer2.last_name}`,
              dancer_age: 2025 - new Date(dancer2.date_of_birth || '').getFullYear(),
              display_order: 2,
            },
          ],
        },
      },
    });
  }

  // Group entry
  await prisma.competition_entries.create({
    data: {
      competition_id: competition.id,
      reservation_id: reservation2.id,
      studio_id: studio2.id,
      title: 'Rhythm Squad',
      category_id: groupCategory.id,
      classification_id: competitiveClass.id,
      age_group_id: teenAge.id,
      entry_size_category_id: smallGroupSize.id,
      music_title: 'Group Anthem',
      choreographer: 'Michael Chen',
      entry_fee: '200.00',
      total_fee: '200.00',
      status: 'draft',
      entry_participants: {
        create: dancers.slice(10, 15).map((dancer, idx) => ({
          dancer_id: dancer.id,
          dancer_name: `${dancer.first_name} ${dancer.last_name}`,
          dancer_age: 2025 - new Date(dancer.date_of_birth || '').getFullYear(),
          display_order: idx + 1,
        })),
      },
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Studios: 3`);
  console.log(`- Dancers: 15`);
  console.log(`- Competition: 1`);
  console.log(`- Reservations: 3`);
  console.log(`- Entries: 9`);
  console.log(`- Categories: 3`);
  console.log(`- Age Groups: 3`);
  console.log(`- Classifications: 3`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
