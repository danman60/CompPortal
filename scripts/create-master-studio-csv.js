const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const downloadsPath = 'C:/Users/Danie/Downloads';

console.log('=== CREATING MASTER STUDIO CSV ===\n');

// Structure: Map<studioName, { name, email, tenant, events: [], reservations: [] }>
const masterData = new Map();

// Parse all Glow files
const glowFiles = [
  { file: 'april 9-12 st catharines.xlsx', event: 'St. Catharines Spring', eventCode: 'STC_SPRING' },
  { file: 'april 23-26th blue mountain.xlsx', event: 'Blue Mountain Spring', eventCode: 'BM_SPRING' },
  { file: 'toronto may 8-10.xlsx', event: 'Toronto', eventCode: 'TORONTO' },
  { file: 'may 14-17 st catharines.xlsx', event: 'St. Catharines Summer', eventCode: 'STC_SUMMER' },
  { file: 'june 4-7 blue mountain.xlsx', event: 'Blue Mountain Summer', eventCode: 'BM_SUMMER' },
];

console.log('--- PROCESSING GLOW FILES ---\n');

glowFiles.forEach(({ file, event, eventCode }) => {
  const filePath = path.join(downloadsPath, file);
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`${event}:`);
    let count = 0;

    data.forEach(row => {
      // Handle multiple possible column names
      const studioName = (row.Studio || row['Studio   '] || row['Studio Name'] || row.studio || '').trim();
      const email = (row.Email || row.email || row['Email Address'] || '').trim();
      const entries = row.Entries || row['Entries held'] || row.entries || 0;

      if (!studioName) return;

      const key = `GLOW_${studioName}`;

      if (!masterData.has(key)) {
        masterData.set(key, {
          tenant: 'Glow',
          tenant_id: '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5',
          studio_name: studioName,
          email: email || '',
          events: [],
          total_entries: 0,
        });
      }

      const studio = masterData.get(key);
      studio.events.push({
        event: event,
        event_code: eventCode,
        entries: entries,
      });
      studio.total_entries += parseInt(entries) || 0;

      // Update email if this file has one and we don't have one yet
      if (email && !studio.email) {
        studio.email = email;
      }

      count++;
    });

    console.log(`  ✅ Processed ${count} reservations\n`);
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
  }
});

// Parse EMPWR Excel file
console.log('--- PROCESSING EMPWR FILE ---\n');

try {
  const filePath = path.join(downloadsPath, 'Studio Data 2026 - CompSync.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let currentEvent = null;
  let count = 0;

  raw.forEach((row) => {
    const firstCell = row[0];

    // Event header detection
    if (firstCell && row.length === 1 && typeof firstCell === 'string' &&
        (firstCell.includes('APRIL') || firstCell.includes('MAY'))) {
      currentEvent = firstCell.trim();
      console.log(`Event: ${currentEvent}`);
    }
    // Skip header row
    else if (firstCell === ' STUDIOS') {
      // Skip
    }
    // Studio row
    else if (currentEvent && firstCell && row[2] && typeof row[2] === 'number') {
      const studioName = firstCell.trim();
      const contact = (row[1] || '').toString().trim();
      const entries = row[2] || 0;
      const deposit = row[3] || 0;

      const key = `EMPWR_${studioName}`;

      if (!masterData.has(key)) {
        masterData.set(key, {
          tenant: 'EMPWR',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          studio_name: studioName,
          email: '',
          contact_person: contact,
          events: [],
          total_entries: 0,
        });
      }

      const studio = masterData.get(key);
      studio.events.push({
        event: currentEvent,
        event_code: currentEvent.replace(/\s+/g, '_').toUpperCase(),
        entries: entries,
        deposit: deposit,
      });
      studio.total_entries += parseInt(entries) || 0;

      count++;
    }
  });

  console.log(`  ✅ Processed ${count} reservations\n`);
} catch (error) {
  console.log(`  ❌ ERROR: ${error.message}\n`);
}

// Generate CSV
console.log('--- GENERATING MASTER CSV ---\n');

const csvRows = [];

// Header row
csvRows.push([
  'Tenant',
  'Tenant_ID',
  'Studio_Name',
  'Email',
  'Contact_Person',
  'Total_Entries',
  'Event_1',
  'Event_1_Entries',
  'Event_2',
  'Event_2_Entries',
  'Event_3',
  'Event_3_Entries',
  'Event_4',
  'Event_4_Entries',
  'Has_Email',
  'Ready_For_Invitation',
].join(','));

// Data rows
masterData.forEach((studio, key) => {
  const hasEmail = studio.email ? 'YES' : 'NO';
  const readyForInvitation = studio.email ? 'YES' : 'NO';

  const row = [
    studio.tenant,
    studio.tenant_id,
    `"${studio.studio_name.replace(/"/g, '""')}"`, // Escape quotes in names
    studio.email ? `"${studio.email.replace(/"/g, '""')}"` : '',
    studio.contact_person ? `"${studio.contact_person.replace(/"/g, '""')}"` : '',
    studio.total_entries,
  ];

  // Add up to 4 events
  for (let i = 0; i < 4; i++) {
    if (studio.events[i]) {
      row.push(`"${studio.events[i].event.replace(/"/g, '""')}"`);
      row.push(studio.events[i].entries);
    } else {
      row.push('');
      row.push('');
    }
  }

  row.push(hasEmail);
  row.push(readyForInvitation);

  csvRows.push(row.join(','));
});

// Write CSV file
const csvContent = csvRows.join('\n');
const outputPath = path.join(__dirname, '..', 'MASTER_STUDIO_DATA.csv');
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`✅ Master CSV created: ${outputPath}\n`);

// Generate summary report
console.log('=== MASTER DATA SUMMARY ===\n');

let glowStudios = 0;
let glowWithEmail = 0;
let glowTotalEntries = 0;

let empwrStudios = 0;
let empwrWithEmail = 0;
let empwrTotalEntries = 0;

masterData.forEach((studio) => {
  if (studio.tenant === 'Glow') {
    glowStudios++;
    if (studio.email) glowWithEmail++;
    glowTotalEntries += studio.total_entries;
  } else {
    empwrStudios++;
    if (studio.email) empwrWithEmail++;
    empwrTotalEntries += studio.total_entries;
  }
});

console.log('GLOW TENANT:');
console.log(`  Studios: ${glowStudios}`);
console.log(`  With Email: ${glowWithEmail} (${Math.round(glowWithEmail/glowStudios*100)}%)`);
console.log(`  Without Email: ${glowStudios - glowWithEmail}`);
console.log(`  Total Entries: ${glowTotalEntries}`);
console.log('');

console.log('EMPWR TENANT:');
console.log(`  Studios: ${empwrStudios}`);
console.log(`  With Email: ${empwrWithEmail} (${Math.round(empwrWithEmail/empwrStudios*100)}%)`);
console.log(`  Without Email: ${empwrStudios - empwrWithEmail}`);
console.log(`  Total Entries: ${empwrTotalEntries}`);
console.log('');

console.log('OVERALL:');
console.log(`  Total Studios: ${glowStudios + empwrStudios}`);
console.log(`  Ready for Invitation: ${glowWithEmail + empwrWithEmail}`);
console.log(`  Need Email: ${(glowStudios - glowWithEmail) + (empwrStudios - empwrWithEmail)}`);
console.log(`  Total Entries: ${glowTotalEntries + empwrTotalEntries}`);
console.log('');

// List studios without emails
console.log('=== STUDIOS MISSING EMAILS ===\n');

console.log('GLOW (Missing Email):');
masterData.forEach((studio) => {
  if (studio.tenant === 'Glow' && !studio.email) {
    console.log(`  - ${studio.studio_name}`);
  }
});

console.log('\nEMPWR (Missing Email):');
masterData.forEach((studio) => {
  if (studio.tenant === 'EMPWR' && !studio.email) {
    console.log(`  - ${studio.studio_name}${studio.contact_person ? ` (Contact: ${studio.contact_person})` : ''}`);
  }
});

console.log('\n✅ Master CSV generation complete!');
console.log(`📄 File location: ${outputPath}`);
