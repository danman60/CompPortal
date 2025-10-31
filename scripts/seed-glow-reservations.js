/**
 * Seed Glow Tenant Reservations from Client Spreadsheets
 *
 * Source: 3 Excel files from Selena (Glow CD)
 * - april 9-12 st catharines.xlsx
 * - april 23-26th blue mountain.xlsx
 * - june 4-7 blue mountain.xlsx
 *
 * Creates:
 * 1. Studios (if not exist)
 * 2. Reservations (approved status)
 * 3. Studio directors (with temp passwords to be claimed)
 */

const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

const GLOW_TENANT_ID = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';

// Map files to competition IDs
const EVENT_MAPPING = {
  'april 9-12 st catharines.xlsx': {
    competitionId: '6c433126-d10b-4198-9eee-2f00187a011d',
    name: 'GLOW St. Catharines Spring 2026',
    dates: '2026-04-09 to 2026-04-12'
  },
  'april 23-26th blue mountain.xlsx': {
    competitionId: '5607b8e5-06dd-4d14-99f6-dfa335df82d3',
    name: 'GLOW Blue Mountain Spring 2026',
    dates: '2026-04-23 to 2026-04-26'
  },
  'june 4-7 blue mountain.xlsx': {
    competitionId: '59d8567b-018f-409b-8e51-3940406197a4',
    name: 'GLOW Blue Mountain Summer 2026',
    dates: '2026-06-04 to 2026-06-07'
  }
};

// Normalize column names (each file has slightly different headers)
const COLUMN_MAPPING = {
  studio: ['Studio', 'Studio   '],
  email: ['Email', 'Email Address'],
  entries: ['Entries', 'Entries held', 'Entries/Spots Held'],
  deposit: ['Deposit Received', 'Deposit received'],
  credits: ['Glow Dollars', 'Glow Dollars/Credits', 'Credits/Glow Dollars'],
  discount: ['Discount', 'Discount incentives']
};

function normalizeRow(row) {
  const normalized = {};

  for (const [key, variants] of Object.entries(COLUMN_MAPPING)) {
    for (const variant of variants) {
      if (row[variant] !== undefined && row[variant] !== null) {
        normalized[key] = row[variant];
        break;
      }
    }
  }

  return normalized;
}

function generatePublicCode() {
  // Generate 5-character alphanumeric code (uppercase)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function seedReservations() {
  const downloadsPath = 'C:/Users/Danie/Downloads';
  const stats = {
    studiosCreated: 0,
    studiosExisting: 0,
    reservationsCreated: 0,
    totalRows: 0,
    errors: []
  };

  console.log('🌟 Starting Glow Tenant Reservation Seeding\n');
  console.log('Tenant ID:', GLOW_TENANT_ID);
  console.log('Files to process:', Object.keys(EVENT_MAPPING).length);
  console.log('='.repeat(80), '\n');

  for (const [filename, eventInfo] of Object.entries(EVENT_MAPPING)) {
    console.log(`\n📄 Processing: ${filename}`);
    console.log(`   Competition: ${eventInfo.name}`);
    console.log(`   Dates: ${eventInfo.dates}`);
    console.log('   ' + '-'.repeat(76));

    const filePath = path.join(downloadsPath, filename);

    try {
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      console.log(`   Studios in file: ${rows.length}\n`);

      for (const rawRow of rows) {
        const row = normalizeRow(rawRow);
        stats.totalRows++;

        // Validate required fields
        if (!row.studio || !row.email || !row.entries) {
          const error = `Missing required fields: ${JSON.stringify(rawRow)}`;
          console.log(`   ❌ ${error}`);
          stats.errors.push({ file: filename, error });
          continue;
        }

        console.log(`   📋 Studio: ${row.studio}`);

        try {
          // Check if studio exists (by name + tenant)
          let studio = await prisma.studios.findFirst({
            where: {
              name: row.studio,
              tenant_id: GLOW_TENANT_ID
            }
          });

          if (studio) {
            console.log(`      ✓ Studio exists (${studio.public_code})`);
            stats.studiosExisting++;
          } else {
            // Create studio with approved status
            const publicCode = generatePublicCode();
            studio = await prisma.studios.create({
              data: {
                tenant_id: GLOW_TENANT_ID,
                name: row.studio,
                code: publicCode, // Internal code
                public_code: publicCode, // Public-facing code
                contact_email: row.email,
                status: 'approved', // Pre-approved
                owner_id: null, // Will be set when SD claims account
                created_at: new Date()
              }
            });
            console.log(`      ✓ Created studio (${publicCode})`);
            stats.studiosCreated++;
          }

          // Check if reservation already exists
          const existingReservation = await prisma.reservations.findFirst({
            where: {
              studio_id: studio.id,
              competition_id: eventInfo.competitionId
            }
          });

          if (existingReservation) {
            console.log(`      ⚠ Reservation already exists (skipping)`);
            continue;
          }

          // Create reservation with approved status
          const reservation = await prisma.reservations.create({
            data: {
              tenant_id: GLOW_TENANT_ID,
              studio_id: studio.id,
              competition_id: eventInfo.competitionId,

              // Reservation details
              requested_entry_count: row.entries,
              approved_entry_count: row.entries, // Pre-approved
              status: 'approved',

              // Financial details
              deposit_amount: row.deposit || 0,
              discount_percentage: row.discount ? row.discount * 100 : 0, // Convert 0.1 → 10
              credits_applied: row.credits || 0,

              // Timestamps
              created_at: new Date(),
              approved_at: new Date(),
              approved_by_user_id: null // System-approved (seeded data)
            }
          });

          console.log(`      ✓ Created reservation:`);
          console.log(`         - Entries: ${row.entries}`);
          console.log(`         - Deposit: $${row.deposit || 0}`);
          console.log(`         - Credits: $${row.credits || 0}`);
          console.log(`         - Discount: ${row.discount ? (row.discount * 100).toFixed(0) : 0}%`);

          stats.reservationsCreated++;

        } catch (error) {
          const errorMsg = `Failed to process studio "${row.studio}": ${error.message}`;
          console.log(`   ❌ ${errorMsg}`);
          stats.errors.push({ file: filename, studio: row.studio, error: error.message });
        }
      }

    } catch (error) {
      const errorMsg = `Failed to read file "${filename}": ${error.message}`;
      console.log(`   ❌ ${errorMsg}`);
      stats.errors.push({ file: filename, error: error.message });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SEEDING SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total rows processed: ${stats.totalRows}`);
  console.log(`Studios created: ${stats.studiosCreated}`);
  console.log(`Studios existing: ${stats.studiosExisting}`);
  console.log(`Reservations created: ${stats.reservationsCreated}`);
  console.log(`Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.file} - ${err.studio || 'File error'}: ${err.error}`);
    });
  }

  console.log('\n✅ Seeding complete!\n');
}

// Run seeding
seedReservations()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
