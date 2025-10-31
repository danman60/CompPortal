const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('C:/Users/Danie/Downloads', 'Studio Data 2026 - CompSync.xlsx');
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

// Get raw data without header processing
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('EMPWR Studio Data 2026 - Raw Structure\n');
console.log('First 5 rows:');
rawData.slice(0, 5).forEach((row, idx) => {
  console.log(`Row ${idx}:`, row);
});

console.log('\n\nParsing data by sections...\n');

// The file appears to have multiple event sections
// Let's manually parse it
let currentEvent = null;
const events = {};

rawData.forEach((row, idx) => {
  const firstCell = row[0];

  // Check if this is an event header (contains dates)
  if (firstCell && typeof firstCell === 'string' && firstCell.includes('APRIL') || firstCell.includes('MAY')) {
    currentEvent = firstCell.trim();
    events[currentEvent] = [];
    console.log(`Found event: ${currentEvent}`);
  }
  // Check if this is a studio row (after headers, has data in columns)
  else if (currentEvent && firstCell && firstCell !== ' STUDIOS' && row[2]) {
    const studio = {
      name: firstCell.trim(),
      contact: row[1],
      entries: row[2],
      deposit: row[3],
      dateReceived: row[4],
      type: row[5],
      accountRec: row[6],
      contactPerson: row[7],
      incentives: row[8]
    };
    events[currentEvent].push(studio);
  }
});

console.log('\n\nParsed Events:\n');
Object.entries(events).forEach(([event, studios]) => {
  console.log(`\n${event}:`);
  console.log(`Studios: ${studios.length}`);
  studios.forEach(studio => {
    console.log(`  - ${studio.name}: ${studio.entries} entries, $${studio.deposit} deposit`);
  });
});
