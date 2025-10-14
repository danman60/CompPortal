import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Use regular DATABASE_URL - it should work for seeding
const prisma = new PrismaClient();

const STUDIO_NAMES = [
  'Spotlight Dance Academy',
  'Rhythm & Motion Studio',
  'Elite Performance Company',
  'Starlight Dance Center',
  'Urban Groove Studios',
  'Grace & Elegance Dance',
  'Fusion Dance Collective',
  'Velocity Dance Studio',
  'Harmony Dance Arts',
  'Momentum Dance Company',
  'Artistry in Motion',
  'Dynamic Dance Works',
  'Elevation Dance Studio',
  'Precision Dance Academy',
  'Ignite Dance Company',
];

const CITIES = [
  { city: 'Toronto', province: 'ON' },
  { city: 'Vancouver', province: 'BC' },
  { city: 'Calgary', province: 'AB' },
  { city: 'Montreal', province: 'QC' },
  { city: 'Ottawa', province: 'ON' },
  { city: 'Edmonton', province: 'AB' },
  { city: 'Winnipeg', province: 'MB' },
  { city: 'Halifax', province: 'NS' },
  { city: 'Victoria', province: 'BC' },
  { city: 'Regina', province: 'SK' },
  { city: 'Saskatoon', province: 'SK' },
  { city: 'Mississauga', province: 'ON' },
  { city: 'Brampton', province: 'ON' },
  { city: 'Surrey', province: 'BC' },
  { city: 'Laval', province: 'QC' },
];

const ROUTINE_TITLES = [
  'Shadows in the Night',
  'Electric Dreams',
  'Breaking Boundaries',
  'Phoenix Rising',
  'Whispers of Grace',
  'Urban Legends',
  'Gravity Defied',
  'Silent Symphony',
  'Midnight Echo',
  'Crimson Tide',
  'Frozen in Time',
  'Wild Hearts',
  'Neon Nights',
  'Crystal Clear',
  'Thunder & Lightning',
];

const DANCE_CATEGORIES = [
  'contemporary',
  'jazz',
  'hip_hop',
  'ballet',
  'lyrical',
  'tap',
  'modern',
];

async function main() {
  console.log('🌱 Starting test data seeding...');

  // Get or create test tenant
  let tenant = await prisma.tenants.findFirst({
    where: { name: 'Test Organization' },
  });

  if (!tenant) {
    tenant = await prisma.tenants.create({
      data: {
        name: 'Test Organization',
        subdomain: 'test',
        slug: 'test-org',
      },
    });
    console.log('✅ Created test tenant');
  }

  // Get competitions (assume they exist from previous setup)
  const competitions = await prisma.competitions.findMany({
    take: 3,
    orderBy: { created_at: 'desc' },
  });

  if (competitions.length === 0) {
    console.log('❌ No competitions found. Please create competitions first.');
    return;
  }

  console.log(`✅ Found ${competitions.length} competitions`);

  // Create test user for studio ownership
  // Note: User profiles are managed via Supabase Auth, skipping for seed data
  console.log('⚠️  Skipping user creation - studios will have null owner_id');

  // Create 15 studios
  console.log('\n📦 Creating 15 test studios...');
  const studios: any[] = [];

  for (let i = 0; i < 15; i++) {
    const location = CITIES[i];
    const studio = await prisma.studios.create({
      data: {
        name: STUDIO_NAMES[i],
        code: `TEST${String(i + 1).padStart(3, '0')}`,
        owner_id: '00000000-0000-0000-0000-000000000000', // Placeholder owner
        email: `${STUDIO_NAMES[i].toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
        phone: `(${Math.floor(Math.random() * 900 + 100)}) ${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        city: location.city,
        province: location.province,
        address1: `${Math.floor(Math.random() * 9000 + 1000)} ${['Main', 'Oak', 'Maple', 'Dance', 'Studio'][Math.floor(Math.random() * 5)]} Street`,
        postal_code: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}`,
        country: 'Canada',
        status: 'active',
        tenant_id: tenant.id,
      },
    });
    studios.push(studio);
    console.log(`  ✓ ${studio.name} (${studio.city}, ${studio.province})`);
  }

  console.log('\n📋 Creating reservations at various stages...');

  // Pipeline stages:
  // 1. Pending (3 studios) - no approval yet
  // 2. Approved - waiting for routines (3 studios) - approved but 0 routines
  // 3. Approved - partial routines (2 studios) - some routines created
  // 4. Summary In (3 studios) - all routines submitted, no invoice
  // 5. Invoiced (2 studios) - invoice created, not paid
  // 6. Paid (2 studios) - fully paid

  let studioIndex = 0;

  // Stage 1: PENDING (3 studios)
  console.log('\n  Stage 1: Pending Reservations (3)');
  for (let i = 0; i < 3; i++) {
    const studio = studios[studioIndex++];
    const competition = competitions[i % competitions.length];
    const spacesRequested = Math.floor(Math.random() * 20) + 5;

    await prisma.reservations.create({
      data: {
        studio_id: studio.id,
        competition_id: competition.id,
        tenant_id: tenant.id,
        spaces_requested: spacesRequested,
        status: 'pending',
        agent_first_name: 'Sarah',
        agent_last_name: 'Johnson',
        agent_email: studio.email,
        agent_phone: studio.phone,
        payment_status: 'pending',
      },
    });
    console.log(`    ✓ ${studio.name} → ${competition.name} (${spacesRequested} spaces requested)`);
  }

  // Stage 2: APPROVED - Waiting for routines (3 studios)
  console.log('\n  Stage 2: Approved - Waiting for Routines (3)');
  for (let i = 0; i < 3; i++) {
    const studio = studios[studioIndex++];
    const competition = competitions[i % competitions.length];
    const spacesConfirmed = Math.floor(Math.random() * 15) + 5;

    await prisma.reservations.create({
      data: {
        studio_id: studio.id,
        competition_id: competition.id,
        tenant_id: tenant.id,
        spaces_requested: spacesConfirmed + Math.floor(Math.random() * 5),
        spaces_confirmed: spacesConfirmed,
        status: 'approved',
        approved_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        agent_first_name: 'Michael',
        agent_last_name: 'Chen',
        agent_email: studio.email,
        agent_phone: studio.phone,
        payment_status: 'pending',
      },
    });
    console.log(`    ✓ ${studio.name} → ${competition.name} (${spacesConfirmed} spaces approved, 0 routines)`);
  }

  // Stage 3: APPROVED - Partial routines (2 studios)
  console.log('\n  Stage 3: Approved - Partial Routines (2)');
  for (let i = 0; i < 2; i++) {
    const studio = studios[studioIndex++];
    const competition = competitions[i % competitions.length];
    const spacesConfirmed = Math.floor(Math.random() * 15) + 10;
    const routinesCreated = Math.floor(spacesConfirmed * 0.6); // 60% of capacity

    const reservation = await prisma.reservations.create({
      data: {
        studio_id: studio.id,
        competition_id: competition.id,
        tenant_id: tenant.id,
        spaces_requested: spacesConfirmed + Math.floor(Math.random() * 5),
        spaces_confirmed: spacesConfirmed,
        status: 'approved',
        approved_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        agent_first_name: 'Jennifer',
        agent_last_name: 'Smith',
        agent_email: studio.email,
        agent_phone: studio.phone,
        payment_status: 'pending',
      },
    });

    // Create partial routines
    for (let j = 0; j < routinesCreated; j++) {
      await prisma.competition_entries.create({
        data: {
          studio_id: studio.id,
          competition_id: competition.id,
          reservation_id: reservation.id,
          tenant_id: tenant.id,
          title: `${ROUTINE_TITLES[j % ROUTINE_TITLES.length]} - ${j + 1}`,
          // dance_category field removed - not in schema
          status: 'submitted',
        },
      });
    }
    console.log(`    ✓ ${studio.name} → ${competition.name} (${routinesCreated}/${spacesConfirmed} routines)`);
  }

  // Stage 4: SUMMARY IN - All routines submitted (3 studios)
  console.log('\n  Stage 4: Summary In - All Routines Submitted (3)');
  for (let i = 0; i < 3; i++) {
    const studio = studios[studioIndex++];
    const competition = competitions[i % competitions.length];
    const spacesConfirmed = Math.floor(Math.random() * 12) + 8;

    const reservation = await prisma.reservations.create({
      data: {
        studio_id: studio.id,
        competition_id: competition.id,
        tenant_id: tenant.id,
        spaces_requested: spacesConfirmed + Math.floor(Math.random() * 5),
        spaces_confirmed: spacesConfirmed,
        status: 'approved',
        approved_at: new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000),
        agent_first_name: 'David',
        agent_last_name: 'Wong',
        agent_email: studio.email,
        agent_phone: studio.phone,
        payment_status: 'pending',
      },
    });

    // Create ALL routines
    for (let j = 0; j < spacesConfirmed; j++) {
      await prisma.competition_entries.create({
        data: {
          studio_id: studio.id,
          competition_id: competition.id,
          reservation_id: reservation.id,
          tenant_id: tenant.id,
          title: `${ROUTINE_TITLES[j % ROUTINE_TITLES.length]} - ${j + 1}`,
          // dance_category field removed - not in schema
          status: 'submitted',
        },
      });
    }
    console.log(`    ✓ ${studio.name} → ${competition.name} (${spacesConfirmed}/${spacesConfirmed} routines)`);
  }

  // Stage 5: INVOICED - Invoice created, not paid (2 studios)
  console.log('\n  Stage 5: Invoiced - Awaiting Payment (2)');
  for (let i = 0; i < 2; i++) {
    const studio = studios[studioIndex++];
    const competition = competitions[i % competitions.length];
    const spacesConfirmed = Math.floor(Math.random() * 12) + 8;
    const entryFee = competition.entry_fee ? Number(competition.entry_fee) : 75;
    const totalAmount = spacesConfirmed * entryFee;

    const reservation = await prisma.reservations.create({
      data: {
        studio_id: studio.id,
        competition_id: competition.id,
        tenant_id: tenant.id,
        spaces_requested: spacesConfirmed + Math.floor(Math.random() * 5),
        spaces_confirmed: spacesConfirmed,
        status: 'approved',
        approved_at: new Date(Date.now() - Math.random() * 28 * 24 * 60 * 60 * 1000),
        agent_first_name: 'Lisa',
        agent_last_name: 'Anderson',
        agent_email: studio.email,
        agent_phone: studio.phone,
        payment_status: 'pending',
      },
    });

    // Create ALL routines
    for (let j = 0; j < spacesConfirmed; j++) {
      await prisma.competition_entries.create({
        data: {
          studio_id: studio.id,
          competition_id: competition.id,
          reservation_id: reservation.id,
          tenant_id: tenant.id,
          title: `${ROUTINE_TITLES[j % ROUTINE_TITLES.length]} - ${j + 1}`,
          // dance_category field removed - not in schema
          status: 'submitted',
        },
      });
    }

    // Create invoice
    await prisma.invoices.create({
      data: {
        studios: { connect: { id: studio.id } },
        competitions: { connect: { id: competition.id } },
        reservations: { connect: { id: reservation.id } },
        tenants: { connect: { id: tenant.id } },
        line_items: [
          {
            description: `Routine registrations (${spacesConfirmed} routines @ $${entryFee.toFixed(2)} each)`,
            quantity: spacesConfirmed,
            unit_price: entryFee,
            total: totalAmount,
          },
        ],
        subtotal: totalAmount,
        total: totalAmount,
        status: 'UNPAID',
        issued_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`    ✓ ${studio.name} → ${competition.name} (Invoice: $${totalAmount.toFixed(2)})`);
  }

  // Stage 6: PAID - Fully paid (2 studios)
  console.log('\n  Stage 6: Paid - Completed (2)');
  for (let i = 0; i < 2; i++) {
    const studio = studios[studioIndex++];
    const competition = competitions[i % competitions.length];
    const spacesConfirmed = Math.floor(Math.random() * 12) + 8;
    const entryFee = competition.entry_fee ? Number(competition.entry_fee) : 75;
    const totalAmount = spacesConfirmed * entryFee;

    const reservation = await prisma.reservations.create({
      data: {
        studio_id: studio.id,
        competition_id: competition.id,
        tenant_id: tenant.id,
        spaces_requested: spacesConfirmed + Math.floor(Math.random() * 5),
        spaces_confirmed: spacesConfirmed,
        status: 'approved',
        approved_at: new Date(Date.now() - Math.random() * 35 * 24 * 60 * 60 * 1000),
        agent_first_name: 'Robert',
        agent_last_name: 'Taylor',
        agent_email: studio.email,
        agent_phone: studio.phone,
        payment_status: 'paid',
        payment_confirmed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Create ALL routines
    for (let j = 0; j < spacesConfirmed; j++) {
      await prisma.competition_entries.create({
        data: {
          studio_id: studio.id,
          competition_id: competition.id,
          reservation_id: reservation.id,
          tenant_id: tenant.id,
          title: `${ROUTINE_TITLES[j % ROUTINE_TITLES.length]} - ${j + 1}`,
          // dance_category field removed - not in schema
          status: 'confirmed',
        },
      });
    }

    // Create paid invoice
    await prisma.invoices.create({
      data: {
        studios: { connect: { id: studio.id } },
        competitions: { connect: { id: competition.id } },
        reservations: { connect: { id: reservation.id } },
        tenants: { connect: { id: tenant.id } },
        line_items: [
          {
            description: `Routine registrations (${spacesConfirmed} routines @ $${entryFee.toFixed(2)} each)`,
            quantity: spacesConfirmed,
            unit_price: entryFee,
            total: totalAmount,
          },
        ],
        subtotal: totalAmount,
        total: totalAmount,
        status: 'PAID',
        issued_at: new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000),
        paid_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`    ✓ ${studio.name} → ${competition.name} (Paid: $${totalAmount.toFixed(2)})`);
  }

  // Summary
  console.log('\n\n📊 Test Data Summary:');
  console.log('═══════════════════════════════════════');

  const studiosCount = await prisma.studios.count();
  const reservationsCount = await prisma.reservations.count();
  const entriesCount = await prisma.competition_entries.count();
  const invoicesCount = await prisma.invoices.count();

  console.log(`✅ Studios: ${studiosCount}`);
  console.log(`✅ Reservations: ${reservationsCount}`);
  console.log(`✅ Routines: ${entriesCount}`);
  console.log(`✅ Invoices: ${invoicesCount}`);

  console.log('\n📋 Pipeline Distribution:');
  const pending = await prisma.reservations.count({ where: { status: 'pending' } });
  const approved = await prisma.reservations.count({ where: { status: 'approved' } });
  const unpaidInvoices = await prisma.invoices.count({ where: { status: 'UNPAID' } });
  const paidInvoices = await prisma.invoices.count({ where: { status: 'PAID' } });

  console.log(`  • Pending: ${pending}`);
  console.log(`  • Approved: ${approved}`);
  console.log(`  • Unpaid Invoices: ${unpaidInvoices}`);
  console.log(`  • Paid Invoices: ${paidInvoices}`);

  console.log('\n✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
