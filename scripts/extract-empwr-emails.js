const XLSX = require('xlsx');
const path = require('path');

const csvPath = 'C:/Users/Danie/Downloads/Studio Data 2026 - CompSync - Sheet1 (1).csv';

console.log('=== EXTRACTING EMPWR STUDIO EMAILS ===\n');

const workbook = XLSX.readFile(csvPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

const studios = new Map();
let currentEvent = null;

data.forEach((row, index) => {
  const firstCol = row.__EMPTY;

  // Event header
  if (firstCol && !row.__EMPTY_1 && (firstCol.includes('APRIL') || firstCol.includes('MAY'))) {
    currentEvent = firstCol.trim();
    console.log(`\nEvent: ${currentEvent}`);
    return;
  }

  // Header row
  if (firstCol === ' STUDIOS') {
    return;
  }

  // Studio row
  if (currentEvent && firstCol && row.__EMPTY_3) {
    const studioName = firstCol.trim();
    const sdName = row.__EMPTY_1 || '';
    const email = row.__EMPTY_2 ? row.__EMPTY_2.trim() : '';
    const entries = parseInt(row.__EMPTY_3) || 0;

    if (!studios.has(studioName)) {
      studios.set(studioName, {
        name: studioName,
        sdName: sdName,
        email: email,
        events: [],
        totalEntries: 0,
      });
    }

    const studio = studios.get(studioName);
    studio.events.push({ event: currentEvent, entries });
    studio.totalEntries += entries;

    // Update email if this row has one and we don't have one yet
    if (email && !studio.email) {
      studio.email = email;
    }

    const emailStatus = email ? '✅' : '❌';
    console.log(`  ${emailStatus} ${studioName} | ${email || 'NO EMAIL'} | ${entries} entries`);
  }
});

console.log('\n=== SUMMARY ===\n');
console.log(`Total EMPWR studios: ${studios.size}`);

let withEmail = 0;
let withoutEmail = 0;

studios.forEach(studio => {
  if (studio.email) withEmail++;
  else withoutEmail++;
});

console.log(`Studios with email: ${withEmail}`);
console.log(`Studios without email: ${withoutEmail}`);

console.log('\n=== SQL UPDATE STATEMENTS ===\n');

studios.forEach(studio => {
  if (studio.email) {
    const escapedName = studio.name.replace(/'/g, "''");
    const escapedEmail = studio.email.replace(/'/g, "''");
    console.log(`UPDATE studios SET email = '${escapedEmail}' WHERE name = '${escapedName}' AND tenant_id = '00000000-0000-0000-0000-000000000001';`);
  }
});

console.log('\n=== STUDIOS MISSING EMAILS ===\n');

studios.forEach(studio => {
  if (!studio.email) {
    console.log(`  - ${studio.name} (SD: ${studio.sdName})`);
  }
});

console.log(`\n✅ Found ${withEmail} EMPWR studio emails!`);
