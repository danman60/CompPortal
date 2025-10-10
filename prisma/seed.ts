import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (optional - comment out if you want to keep existing data)
  console.log('📝 Cleaning existing test data...');

  // Fetch tenants (created in migration)
  console.log('🏢 Fetching tenants...');
  const demoTenant = await prisma.tenants.findUnique({
    where: { slug: 'demo' },
  });
  const empwrTenant = await prisma.tenants.findUnique({
    where: { slug: 'empwr' },
  });

  if (!demoTenant || !empwrTenant) {
    throw new Error('Tenants not found. Run migrations first.');
  }

  // Create test users first (required for studio owner_id foreign key)
  console.log('👥 Creating test users...');
  const testUser1 = await prisma.users.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'owner1@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const testUser2 = await prisma.users.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'owner2@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const testUser3 = await prisma.users.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'owner3@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Create lookup tables first
  console.log('📚 Creating dance categories (styles)...');
  const jazzCategory = await prisma.dance_categories.upsert({
    where: { name: 'Jazz' },
    update: {},
    create: {
      name: 'Jazz',
      description: 'Jazz dance style',
      color_code: '#FF6B6B',
    },
  });

  const contemporaryCategory = await prisma.dance_categories.upsert({
    where: { name: 'Contemporary' },
    update: {},
    create: {
      name: 'Contemporary',
      description: 'Contemporary dance style',
      color_code: '#4ECDC4',
    },
  });

  const hipHopCategory = await prisma.dance_categories.upsert({
    where: { name: 'Hip Hop' },
    update: {},
    create: {
      name: 'Hip Hop',
      description: 'Hip hop dance style',
      color_code: '#FFE66D',
    },
  });

  console.log('📊 Creating age groups...');
  const petiteAge = await prisma.age_groups.create({
    data: {
      name: 'Petite',
      min_age: 5,
      max_age: 8,
    },
  });

  const juniorAge = await prisma.age_groups.create({
    data: {
      name: 'Junior',
      min_age: 9,
      max_age: 11,
    },
  });

  const teenAge = await prisma.age_groups.create({
    data: {
      name: 'Teen',
      min_age: 12,
      max_age: 14,
    },
  });

  console.log('🎯 Creating classifications...');
  const recreationalClass = await prisma.classifications.upsert({
    where: { name: 'Recreational' },
    update: {},
    create: {
      name: 'Recreational',
      description: 'For fun and enjoyment',
      skill_level: 1,
    },
  });

  const competitiveClass = await prisma.classifications.upsert({
    where: { name: 'Competitive' },
    update: {},
    create: {
      name: 'Competitive',
      description: 'Competitive level dancers',
      skill_level: 2,
    },
  });

  const eliteClass = await prisma.classifications.upsert({
    where: { name: 'Elite' },
    update: {},
    create: {
      name: 'Elite',
      description: 'Highest competitive level',
      skill_level: 3,
    },
  });

  console.log('📏 Creating entry size categories...');
  const soloSize = await prisma.entry_size_categories.create({
    data: {
      name: 'Solo',
      min_participants: 1,
      max_participants: 1,
      base_fee: 75.00,
    },
  });

  const duoSize = await prisma.entry_size_categories.create({
    data: {
      name: 'Duo/Trio',
      min_participants: 2,
      max_participants: 3,
      base_fee: 85.00,
    },
  });

  const smallGroupSize = await prisma.entry_size_categories.create({
    data: {
      name: 'Small Group',
      min_participants: 4,
      max_participants: 9,
      base_fee: 95.00,
    },
  });

  const largeGroupSize = await prisma.entry_size_categories.create({
    data: {
      name: 'Large Group',
      min_participants: 10,
      max_participants: 24,
      base_fee: 110.00,
    },
  });

  // Create test studios
  console.log('🏢 Creating test studios...');
  const studio1 = await prisma.studios.create({
    data: {
      name: 'Starlight Dance Academy',
      code: 'SDA',
      owner_id: testUser1.id,
      tenant_id: demoTenant.id,
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
      owner_id: testUser2.id,
      tenant_id: demoTenant.id,
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
      owner_id: testUser3.id,
      tenant_id: demoTenant.id,
      email: 'hello@rhythmmotion.com',
      phone: '604-555-0300',
      city: 'Surrey',
      province: 'BC',
      country: 'Canada',
      status: 'pending',
    },
  });

  // Create EMPWR Dance competitions
  console.log('🏆 Creating EMPWR Dance competitions...');
  const empwrLondon = await prisma.competitions.create({
    data: {
      name: 'EMPWR Dance - London',
      year: 2026,
      tenant_id: empwrTenant.id,
      description: 'EMPWR Dance Competition in London, Ontario',
      registration_opens: new Date('2026-01-15'),
      registration_closes: new Date('2026-04-01'),
      competition_start_date: new Date('2026-04-10'),
      competition_end_date: new Date('2026-04-12'),
      primary_location: 'London, ON',
      venue_capacity: 500,
      session_count: 3,
      number_of_judges: 5,
      entry_fee: '75.00',
      late_fee: '25.00',
      status: 'upcoming',
      is_public: true,
      contact_email: 'info@empwrdance.com',
      contact_phone: '1-800-EMPWR',
    },
  });

  const empwrStCath1 = await prisma.competitions.create({
    data: {
      name: 'EMPWR Dance - St. Catharines #1',
      year: 2026,
      tenant_id: empwrTenant.id,
      description: 'EMPWR Dance Competition in St. Catharines, Ontario',
      registration_opens: new Date('2026-01-15'),
      registration_closes: new Date('2026-04-07'),
      competition_start_date: new Date('2026-04-16'),
      competition_end_date: new Date('2026-04-18'),
      primary_location: 'St. Catharines, ON',
      venue_capacity: 500,
      session_count: 3,
      number_of_judges: 5,
      entry_fee: '75.00',
      late_fee: '25.00',
      status: 'upcoming',
      is_public: true,
      contact_email: 'info@empwrdance.com',
      contact_phone: '1-800-EMPWR',
    },
  });

  const empwrStCath2 = await prisma.competitions.create({
    data: {
      name: 'EMPWR Dance - St. Catharines #2',
      year: 2026,
      tenant_id: empwrTenant.id,
      description: 'EMPWR Dance Competition in St. Catharines, Ontario',
      registration_opens: new Date('2026-01-15'),
      registration_closes: new Date('2026-04-28'),
      competition_start_date: new Date('2026-05-07'),
      competition_end_date: new Date('2026-05-09'),
      primary_location: 'St. Catharines, ON',
      venue_capacity: 500,
      session_count: 3,
      number_of_judges: 5,
      entry_fee: '75.00',
      late_fee: '25.00',
      status: 'upcoming',
      is_public: true,
      contact_email: 'info@empwrdance.com',
      contact_phone: '1-800-EMPWR',
    },
  });

  // Create GLOW Dance competitions (2026 Tour)
  console.log('✨ Creating GLOW Dance tour competitions...');
  const glowOrlando = await prisma.competitions.create({
    data: {
      name: 'GLOW Dance - Orlando',
      year: 2026,
      tenant_id: demoTenant.id,
      description: 'GLOW Dance Championship Tour - Orlando, Florida',
      registration_opens: new Date('2025-12-01'),
      registration_closes: new Date('2026-02-10'),
      competition_start_date: new Date('2026-02-20'),
      competition_end_date: new Date('2026-02-22'),
      primary_location: 'Orlando, FL',
      venue_capacity: 600,
      session_count: 4,
      number_of_judges: 7,
      entry_fee: '85.00',
      late_fee: '30.00',
      status: 'registration_open',
      is_public: true,
      contact_email: 'info@glowdance.com',
      contact_phone: '1-800-GLOW',
      website: 'https://glowdance.com',
    },
  });

  const glowStCath1 = await prisma.competitions.create({
    data: {
      name: 'GLOW Dance - St. Catharines (Spring)',
      year: 2026,
      tenant_id: demoTenant.id,
      description: 'GLOW Dance Championship Tour - St. Catharines, Ontario',
      registration_opens: new Date('2026-01-15'),
      registration_closes: new Date('2026-03-30'),
      competition_start_date: new Date('2026-04-09'),
      competition_end_date: new Date('2026-04-12'),
      primary_location: 'St. Catharines, ON',
      venue_capacity: 650,
      session_count: 4,
      number_of_judges: 7,
      entry_fee: '85.00',
      late_fee: '30.00',
      status: 'upcoming',
      is_public: true,
      contact_email: 'info@glowdance.com',
      contact_phone: '1-800-GLOW',
      website: 'https://glowdance.com',
    },
  });

  const glowBlueMountain1 = await prisma.competitions.create({
    data: {
      name: 'GLOW Dance - Blue Mountain (April)',
      year: 2026,
      tenant_id: demoTenant.id,
      description: 'GLOW Dance Championship Tour - Blue Mountain, Ontario',
      registration_opens: new Date('2026-01-15'),
      registration_closes: new Date('2026-04-14'),
      competition_start_date: new Date('2026-04-23'),
      competition_end_date: new Date('2026-04-26'),
      primary_location: 'Blue Mountain, ON',
      venue_capacity: 550,
      session_count: 4,
      number_of_judges: 7,
      entry_fee: '85.00',
      late_fee: '30.00',
      status: 'upcoming',
      is_public: true,
      contact_email: 'info@glowdance.com',
      contact_phone: '1-800-GLOW',
      website: 'https://glowdance.com',
    },
  });

  const glowToronto = await prisma.competitions.create({
    data: {
      name: 'GLOW Dance - Toronto',
      year: 2026,
      tenant_id: demoTenant.id,
      description: 'GLOW Dance Championship Tour - Toronto, Ontario',
      registration_opens: new Date('2026-02-01'),
      registration_closes: new Date('2026-04-29'),
      competition_start_date: new Date('2026-05-08'),
      competition_end_date: new Date('2026-05-10'),
      primary_location: 'Toronto, ON',
      venue_capacity: 700,
      session_count: 4,
      number_of_judges: 7,
      entry_fee: '85.00',
      late_fee: '30.00',
      status: 'upcoming',
      is_public: true,
      contact_email: 'info@glowdance.com',
      contact_phone: '1-800-GLOW',
      website: 'https://glowdance.com',
    },
  });

  const glowStCath2 = await prisma.competitions.create({
    data: {
      name: 'GLOW Dance - St. Catharines (May)',
      year: 2026,
      tenant_id: demoTenant.id,
      description: 'GLOW Dance Championship Tour - St. Catharines, Ontario',
      registration_opens: new Date('2026-02-01'),
      registration_closes: new Date('2026-05-05'),
      competition_start_date: new Date('2026-05-14'),
      competition_end_date: new Date('2026-05-17'),
      primary_location: 'St. Catharines, ON',
      venue_capacity: 650,
      session_count: 4,
      number_of_judges: 7,
      entry_fee: '85.00',
      late_fee: '30.00',
      status: 'upcoming',
      is_public: true,
      contact_email: 'info@glowdance.com',
      contact_phone: '1-800-GLOW',
      website: 'https://glowdance.com',
    },
  });

  const glowBlueMountain2 = await prisma.competitions.create({
    data: {
      name: 'GLOW Dance - Blue Mountain (June)',
      year: 2026,
      tenant_id: demoTenant.id,
      description: 'GLOW Dance Championship Tour - Blue Mountain, Ontario',
      registration_opens: new Date('2026-02-15'),
      registration_closes: new Date('2026-05-26'),
      competition_start_date: new Date('2026-06-04'),
      competition_end_date: new Date('2026-06-07'),
      primary_location: 'Blue Mountain, ON',
      venue_capacity: 550,
      session_count: 4,
      number_of_judges: 7,
      entry_fee: '85.00',
      late_fee: '30.00',
      status: 'upcoming',
      is_public: true,
      contact_email: 'info@glowdance.com',
      contact_phone: '1-800-GLOW',
      website: 'https://glowdance.com',
    },
  });

  // Use GLOW Orlando for comprehensive seed data
  const competition = glowOrlando;

  // Create realistic test dancers for GlowDance Orlando
  console.log('👯 Creating dancers for GlowDance Orlando...');
  const dancers: any[] = [];

  // Realistic dancer data for demo purposes
  const realisticDancers = [
    // Starlight Dance Academy (studio1) - 20 dancers
    { first: 'Sophia', last: 'Martinez', age: 7, gender: 'Female', style: 'Ballet', level: 'beginner' },
    { first: 'Emma', last: 'Johnson', age: 9, gender: 'Female', style: 'Jazz', level: 'intermediate' },
    { first: 'Olivia', last: 'Williams', age: 11, gender: 'Female', style: 'Contemporary', level: 'advanced' },
    { first: 'Ava', last: 'Davis', age: 8, gender: 'Female', style: 'Tap', level: 'intermediate' },
    { first: 'Isabella', last: 'Rodriguez', age: 10, gender: 'Female', style: 'Jazz', level: 'advanced' },
    { first: 'Mia', last: 'Garcia', age: 12, gender: 'Female', style: 'Contemporary', level: 'advanced' },
    { first: 'Charlotte', last: 'Wilson', age: 7, gender: 'Female', style: 'Ballet', level: 'beginner' },
    { first: 'Amelia', last: 'Moore', age: 13, gender: 'Female', style: 'Hip Hop', level: 'advanced' },
    { first: 'Harper', last: 'Taylor', age: 9, gender: 'Female', style: 'Jazz', level: 'intermediate' },
    { first: 'Evelyn', last: 'Anderson', age: 14, gender: 'Female', style: 'Contemporary', level: 'advanced' },
    // Elite Performance Studio (studio2) - 15 dancers
    { first: 'Liam', last: 'Thompson', age: 10, gender: 'Male', style: 'Hip Hop', level: 'intermediate' },
    { first: 'Noah', last: 'White', age: 12, gender: 'Male', style: 'Contemporary', level: 'advanced' },
    { first: 'Chloe', last: 'Harris', age: 11, gender: 'Female', style: 'Jazz', level: 'advanced' },
    { first: 'Grace', last: 'Martin', age: 9, gender: 'Female', style: 'Ballet', level: 'intermediate' },
    { first: 'Lily', last: 'Lee', age: 13, gender: 'Female', style: 'Contemporary', level: 'advanced' },
    { first: 'Ella', last: 'Walker', age: 8, gender: 'Female', style: 'Tap', level: 'beginner' },
    { first: 'Aria', last: 'Hall', age: 14, gender: 'Female', style: 'Jazz', level: 'advanced' },
    { first: 'Scarlett', last: 'Allen', age: 10, gender: 'Female', style: 'Hip Hop', level: 'intermediate' },
    { first: 'Victoria', last: 'Young', age: 12, gender: 'Female', style: 'Contemporary', level: 'advanced' },
    { first: 'Madison', last: 'King', age: 11, gender: 'Female', style: 'Jazz', level: 'advanced' },
    // Rhythm & Motion Dance (studio3) - 10 dancers
    { first: 'Ethan', last: 'Wright', age: 9, gender: 'Male', style: 'Hip Hop', level: 'intermediate' },
    { first: 'Zoe', last: 'Lopez', age: 10, gender: 'Female', style: 'Contemporary', level: 'intermediate' },
    { first: 'Layla', last: 'Hill', age: 8, gender: 'Female', style: 'Jazz', level: 'beginner' },
    { first: 'Penelope', last: 'Scott', age: 11, gender: 'Female', style: 'Ballet', level: 'intermediate' },
    { first: 'Riley', last: 'Green', age: 12, gender: 'Female', style: 'Contemporary', level: 'advanced' },
    { first: 'Nora', last: 'Adams', age: 13, gender: 'Female', style: 'Jazz', level: 'advanced' },
    { first: 'Hazel', last: 'Baker', age: 7, gender: 'Female', style: 'Tap', level: 'beginner' },
    { first: 'Ellie', last: 'Gonzalez', age: 9, gender: 'Female', style: 'Hip Hop', level: 'intermediate' },
    { first: 'Luna', last: 'Nelson', age: 14, gender: 'Female', style: 'Contemporary', level: 'advanced' },
    { first: 'Stella', last: 'Carter', age: 10, gender: 'Female', style: 'Jazz', level: 'intermediate' },
  ];

  for (let i = 0; i < realisticDancers.length; i++) {
    const dancerData = realisticDancers[i];
    const studioId = i < 10 ? studio1.id : i < 25 ? studio2.id : studio3.id;

    const dancer = await prisma.dancers.create({
      data: {
        studio_id: studioId,
        tenant_id: demoTenant.id,
        first_name: dancerData.first,
        last_name: dancerData.last,
        date_of_birth: new Date(`${2025 - dancerData.age}-${3 + (i % 9)}-${10 + (i % 20)}`),
        gender: dancerData.gender,
        email: `${dancerData.first.toLowerCase()}.${dancerData.last.toLowerCase()}@email.com`,
        phone: `407-555-${1000 + i}`,
        parent_name: `${dancerData.gender === 'Male' ? 'Mr. & Mrs.' : 'Mr. & Mrs.'} ${dancerData.last}`,
        parent_email: `parent.${dancerData.last.toLowerCase()}@email.com`,
        parent_phone: `407-555-${2000 + i}`,
        years_dancing: Math.min(dancerData.age - 3, 12),
        primary_style: dancerData.style,
        skill_level: dancerData.level,
        previous_competitions: dancerData.level === 'advanced' ? 8 + (i % 5) : dancerData.level === 'intermediate' ? 3 + (i % 4) : i % 3,
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
      tenant_id: demoTenant.id,
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
      tenant_id: demoTenant.id,
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
      tenant_id: demoTenant.id,
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

  // Starlight Dance Academy (studio1) - Solo entries from dancers 0-6
  const soloCategories = [jazzCategory, contemporaryCategory, hipHopCategory];
  for (let i = 0; i < 7; i++) {
    const dancer = dancers[i];
    await prisma.competition_entries.create({
      data: {
        competition_id: competition.id,
        reservation_id: reservation1.id,
        studio_id: studio1.id,
        tenant_id: demoTenant.id,
        title: `${dancer.primary_style} Solo - ${dancer.first_name}`,
        category_id: soloCategories[i % 3].id,
        classification_id: competitiveClass.id,
        age_group_id: i < 3 ? petiteAge.id : juniorAge.id,
        entry_size_category_id: soloSize.id,
        music_title: `${dancer.primary_style} Track`,
        music_artist: `Various Artists`,
        choreographer: 'Sarah Johnson',
        entry_fee: '75.00',
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

  // Starlight Dance Academy - Duo entries (dancers 7-9)
  await prisma.competition_entries.create({
    data: {
      competition_id: competition.id,
      reservation_id: reservation1.id,
      studio_id: studio1.id,
      tenant_id: demoTenant.id,
      title: 'Ballet Duet - Elegance',
      category_id: jazzCategory.id,
      classification_id: eliteClass.id,
      age_group_id: juniorAge.id,
      entry_size_category_id: duoSize.id,
      music_title: 'Swan Lake Variation',
      choreographer: 'Sarah Johnson',
      entry_fee: '150.00',
      total_fee: '150.00',
      status: 'confirmed',
      entry_participants: {
        create: [
          {
            dancer_id: dancers[7].id,
            dancer_name: `${dancers[7].first_name} ${dancers[7].last_name}`,
            dancer_age: 2025 - new Date(dancers[7].date_of_birth || '').getFullYear(),
            display_order: 1,
          },
          {
            dancer_id: dancers[8].id,
            dancer_name: `${dancers[8].first_name} ${dancers[8].last_name}`,
            dancer_age: 2025 - new Date(dancers[8].date_of_birth || '').getFullYear(),
            display_order: 2,
          },
        ],
      },
    },
  });

  // Elite Performance Studio (studio2) - Solo entries from dancers 10-15
  for (let i = 10; i < 16; i++) {
    const dancer = dancers[i];
    await prisma.competition_entries.create({
      data: {
        competition_id: competition.id,
        reservation_id: reservation2.id,
        studio_id: studio2.id,
        tenant_id: demoTenant.id,
        title: `${dancer.primary_style} Solo - ${dancer.first_name}`,
        category_id: soloCategories[(i - 10) % 3].id,
        classification_id: i < 13 ? competitiveClass.id : eliteClass.id,
        age_group_id: i < 13 ? juniorAge.id : teenAge.id,
        entry_size_category_id: soloSize.id,
        music_title: `${dancer.primary_style} Performance`,
        choreographer: 'Michael Chen',
        entry_fee: '75.00',
        total_fee: '75.00',
        status: 'confirmed',
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

  // Elite Performance Studio - Trio entries (dancers 16-21)
  await prisma.competition_entries.create({
    data: {
      competition_id: competition.id,
      reservation_id: reservation2.id,
      studio_id: studio2.id,
      tenant_id: demoTenant.id,
      title: 'Contemporary Trio - Flow',
      category_id: contemporaryCategory.id,
      classification_id: eliteClass.id,
      age_group_id: teenAge.id,
      entry_size_category_id: smallGroupSize.id,
      music_title: 'River of Dreams',
      choreographer: 'Michael Chen',
      entry_fee: '175.00',
      total_fee: '175.00',
      status: 'confirmed',
      entry_participants: {
        create: [
          {
            dancer_id: dancers[16].id,
            dancer_name: `${dancers[16].first_name} ${dancers[16].last_name}`,
            dancer_age: 2025 - new Date(dancers[16].date_of_birth || '').getFullYear(),
            display_order: 1,
          },
          {
            dancer_id: dancers[17].id,
            dancer_name: `${dancers[17].first_name} ${dancers[17].last_name}`,
            dancer_age: 2025 - new Date(dancers[17].date_of_birth || '').getFullYear(),
            display_order: 2,
          },
          {
            dancer_id: dancers[18].id,
            dancer_name: `${dancers[18].first_name} ${dancers[18].last_name}`,
            dancer_age: 2025 - new Date(dancers[18].date_of_birth || '').getFullYear(),
            display_order: 3,
          },
        ],
      },
    },
  });

  await prisma.competition_entries.create({
    data: {
      competition_id: competition.id,
      reservation_id: reservation2.id,
      studio_id: studio2.id,
      tenant_id: demoTenant.id,
      title: 'Hip Hop Trio - Urban Beat',
      category_id: hipHopCategory.id,
      classification_id: competitiveClass.id,
      age_group_id: juniorAge.id,
      entry_size_category_id: smallGroupSize.id,
      music_title: 'Street Rhythm',
      choreographer: 'Michael Chen',
      entry_fee: '175.00',
      total_fee: '175.00',
      status: 'confirmed',
      entry_participants: {
        create: [
          {
            dancer_id: dancers[19].id,
            dancer_name: `${dancers[19].first_name} ${dancers[19].last_name}`,
            dancer_age: 2025 - new Date(dancers[19].date_of_birth || '').getFullYear(),
            display_order: 1,
          },
          {
            dancer_id: dancers[20].id,
            dancer_name: `${dancers[20].first_name} ${dancers[20].last_name}`,
            dancer_age: 2025 - new Date(dancers[20].date_of_birth || '').getFullYear(),
            display_order: 2,
          },
          {
            dancer_id: dancers[21].id,
            dancer_name: `${dancers[21].first_name} ${dancers[21].last_name}`,
            dancer_age: 2025 - new Date(dancers[21].date_of_birth || '').getFullYear(),
            display_order: 3,
          },
        ],
      },
    },
  });

  // Elite Performance Studio - Small Group (dancers 22-24 + 10-12)
  await prisma.competition_entries.create({
    data: {
      competition_id: competition.id,
      reservation_id: reservation2.id,
      studio_id: studio2.id,
      tenant_id: demoTenant.id,
      title: 'Elite Ensemble - Unity',
      category_id: jazzCategory.id,
      classification_id: eliteClass.id,
      age_group_id: teenAge.id,
      entry_size_category_id: smallGroupSize.id,
      music_title: 'Together We Rise',
      choreographer: 'Michael Chen',
      entry_fee: '200.00',
      total_fee: '200.00',
      status: 'confirmed',
      entry_participants: {
        create: [10, 11, 12, 22, 23, 24].map((idx, order) => ({
          dancer_id: dancers[idx].id,
          dancer_name: `${dancers[idx].first_name} ${dancers[idx].last_name}`,
          dancer_age: 2025 - new Date(dancers[idx].date_of_birth || '').getFullYear(),
          display_order: order + 1,
        })),
      },
    },
  });

  // Rhythm & Motion Dance (studio3) - Solo entries from dancers 25-29
  for (let i = 25; i < 30; i++) {
    const dancer = dancers[i];
    await prisma.competition_entries.create({
      data: {
        competition_id: competition.id,
        reservation_id: reservation3.id,
        studio_id: studio3.id,
        tenant_id: demoTenant.id,
        title: `${dancer.primary_style} Solo - ${dancer.first_name}`,
        category_id: soloCategories[(i - 25) % 3].id,
        classification_id: competitiveClass.id,
        age_group_id: i < 28 ? petiteAge.id : juniorAge.id,
        entry_size_category_id: soloSize.id,
        music_title: `${dancer.primary_style} Showcase`,
        choreographer: 'Emily Rodriguez',
        entry_fee: '75.00',
        total_fee: '75.00',
        status: 'draft',
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

  // Rhythm & Motion Dance - Duo entry (dancers 25-26)
  await prisma.competition_entries.create({
    data: {
      competition_id: competition.id,
      reservation_id: reservation3.id,
      studio_id: studio3.id,
      tenant_id: demoTenant.id,
      title: 'Jazz Duo - Synergy',
      category_id: jazzCategory.id,
      classification_id: competitiveClass.id,
      age_group_id: petiteAge.id,
      entry_size_category_id: duoSize.id,
      music_title: 'Perfect Harmony',
      choreographer: 'Emily Rodriguez',
      entry_fee: '150.00',
      total_fee: '150.00',
      status: 'draft',
      entry_participants: {
        create: [
          {
            dancer_id: dancers[25].id,
            dancer_name: `${dancers[25].first_name} ${dancers[25].last_name}`,
            dancer_age: 2025 - new Date(dancers[25].date_of_birth || '').getFullYear(),
            display_order: 1,
          },
          {
            dancer_id: dancers[26].id,
            dancer_name: `${dancers[26].first_name} ${dancers[26].last_name}`,
            dancer_age: 2025 - new Date(dancers[26].date_of_birth || '').getFullYear(),
            display_order: 2,
          },
        ],
      },
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Studios: 3`);
  console.log(`- Dancers: 30`);
  console.log(`- Competitions: 10 (3 EMPWR + 7 GLOW Dance 2026 Tour)`);
  console.log(`- Reservations: 3`);
  console.log(`- Entries: 23 (8 studio1 + 9 studio2 + 6 studio3)`);
  console.log(`- Categories: 3`);
  console.log(`- Age Groups: 3`);
  console.log(`- Classifications: 3`);
  console.log(`- Entry Size Categories: 3`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
