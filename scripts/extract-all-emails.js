const XLSX = require('xlsx');
const path = require('path');

const downloadsPath = 'C:/Users/Danie/Downloads';

console.log('=== EXTRACTING ALL STUDIO EMAILS ===\n');

// Parse EMPWR file
console.log('--- EMPWR Studios ---\n');
const empwrPath = path.join(downloadsPath, 'Studio Data 2026 - CompSync.xlsx');
const empwrWorkbook = XLSX.readFile(empwrPath);
const empwrSheet = empwrWorkbook.Sheets[empwrWorkbook.SheetNames[0]];
const empwrRaw = XLSX.utils.sheet_to_json(empwrSheet, { header: 1 });

let currentEvent = null;
const empwrStudios = {};

empwrRaw.forEach((row) => {
  const firstCell = row[0];

  // Event header
  if (firstCell && row.length === 1 && typeof firstCell === 'string' &&
      (firstCell.includes('APRIL') || firstCell.includes('MAY'))) {
    currentEvent = firstCell.trim();
    empwrStudios[currentEvent] = [];
  }
  // Skip header row
  else if (firstCell === ' STUDIOS') {
    // Skip
  }
  // Studio row
  else if (currentEvent && firstCell && row[2] && typeof row[2] === 'number') {
    empwrStudios[currentEvent].push({
      name: firstCell.trim(),
      contact: row[1] || null,
      entries: row[2],
      deposit: row[3] || 0,
      email: row[7] || null, // Contact Person column
    });
  }
});

// Print EMPWR studios
Object.entries(empwrStudios).forEach(([event, studios]) => {
  console.log(`${event}:`);
  studios.forEach(s => {
    console.log(`  ${s.name} | Email: ${s.email || 'MISSING'}`);
  });
  console.log('');
});

// Parse Glow files
const glowFiles = [
  { file: 'april 9-12 st catharines.xlsx', event: 'St. Catharines Spring' },
  { file: 'april 23-26th blue mountain.xlsx', event: 'Blue Mountain Spring' },
  { file: 'toronto may 8-10.xlsx', event: 'Toronto' },
  { file: 'june 4-7 blue mountain.xlsx', event: 'Blue Mountain Summer' },
];

console.log('\n--- Glow Studios ---\n');

glowFiles.forEach(({ file, event }) => {
  const filePath = path.join(downloadsPath, file);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`${event}:`);
  data.forEach(row => {
    const email = row.Email || row.email || row['Email Address'] || null;
    console.log(`  ${row.Studio} | Email: ${email || 'MISSING'}`);
  });
  console.log('');
});

// Generate SQL update statements
console.log('\n\n=== SQL UPDATE STATEMENTS ===\n');

// EMPWR studios
Object.entries(empwrStudios).forEach(([event, studios]) => {
  studios.forEach(s => {
    if (s.email) {
      console.log(`UPDATE studios SET email = '${s.email}' WHERE name = '${s.name.replace(/'/g, "''")}' AND tenant_id = '00000000-0000-0000-0000-000000000001';`);
    }
  });
});

// Glow studios
glowFiles.forEach(({ file, event }) => {
  const filePath = path.join(downloadsPath, file);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  data.forEach(row => {
    const email = row.Email || row.email || row['Email Address'] || null;
    if (email) {
      console.log(`UPDATE studios SET email = '${email}' WHERE name = '${row.Studio.replace(/'/g, "''")}' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';`);
    }
  });
});
