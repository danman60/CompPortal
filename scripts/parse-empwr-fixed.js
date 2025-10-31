const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('C:/Users/Danie/Downloads', 'Studio Data 2026 - CompSync.xlsx');
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

// Get raw data without header processing
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('EMPWR Studio Data 2026\n');

let currentEvent = null;
const events = {};

rawData.forEach((row, idx) => {
  const firstCell = row[0];

  // Check if this is an event header (single cell row with dates)
  if (firstCell && row.length === 1 && typeof firstCell === 'string' &&
      (firstCell.includes('APRIL') || firstCell.includes('MAY') || firstCell.includes('ST CAT'))) {
    currentEvent = firstCell.trim();
    events[currentEvent] = [];
    console.log(`\nFound event: ${currentEvent}`);
  }
  // Skip header row
  else if (firstCell === ' STUDIOS') {
    console.log('  (skipping header row)');
  }
  // Parse studio rows (has name and entry count)
  else if (currentEvent && firstCell && row[2]) {
    const studio = {
      name: firstCell.trim(),
      contact: row[1],
      entries: row[2],
      deposit: row[3] || 0,
      dateReceived: row[4],
      type: row[5],
      accountRec: row[6],
      contactPerson: row[7],
      incentives: row[8]
    };

    // Only add if it looks like real data (has entries)
    if (typeof studio.entries === 'number') {
      events[currentEvent].push(studio);
      console.log(`  - ${studio.name}: ${studio.entries} entries, $${studio.deposit} deposit`);
    }
  }
});

console.log('\n\n=== SUMMARY ===\n');
Object.entries(events).forEach(([event, studios]) => {
  const totalEntries = studios.reduce((sum, s) => sum + s.entries, 0);
  const totalDeposits = studios.reduce((sum, s) => sum + (s.deposit || 0), 0);
  console.log(`${event}:`);
  console.log(`  Studios: ${studios.length}`);
  console.log(`  Total Entries: ${totalEntries}`);
  console.log(`  Total Deposits: $${totalDeposits}`);
});

// Also parse the Toronto file
console.log('\n\n=== TORONTO MAY 8-10 ===\n');
const torontoPath = path.join('C:/Users/Danie/Downloads', 'toronto may 8-10.xlsx');
const torontoWorkbook = XLSX.readFile(torontoPath);
const torontoSheet = torontoWorkbook.Sheets[torontoWorkbook.SheetNames[0]];
const torontoData = XLSX.utils.sheet_to_json(torontoSheet);

console.log(`Studios: ${torontoData.length}`);
const torontoTotal = torontoData.reduce((sum, s) => sum + s.Entries, 0);
const torontoDeposits = torontoData.reduce((sum, s) => sum + (s['Deposit Received'] || 0), 0);
const torontoCredits = torontoData.reduce((sum, s) => sum + (s['Glow Dollars'] || 0), 0);
console.log(`Total Entries: ${torontoTotal}`);
console.log(`Total Deposits: $${torontoDeposits}`);
console.log(`Total Credits: $${torontoCredits}`);

torontoData.forEach(studio => {
  console.log(`  - ${studio.Studio}: ${studio.Entries} entries, $${studio['Deposit Received']} deposit, $${studio['Glow Dollars']} credits`);
});
