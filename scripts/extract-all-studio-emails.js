const XLSX = require('xlsx');
const path = require('path');

const downloadsPath = 'C:/Users/Danie/Downloads';

console.log('=== EXTRACTING ALL STUDIO EMAILS ===\n');

// Parse all Glow files
const glowFiles = [
  { file: 'april 9-12 st catharines.xlsx', event: 'St. Catharines Spring' },
  { file: 'april 23-26th blue mountain.xlsx', event: 'Blue Mountain Spring' },
  { file: 'toronto may 8-10.xlsx', event: 'Toronto' },
  { file: 'may 14-17 st catharines.xlsx', event: 'St. Catharines Summer' },
  { file: 'june 4-7 blue mountain.xlsx', event: 'Blue Mountain Summer' },
];

console.log('--- GLOW STUDIOS ---\n');

const glowStudios = new Map(); // Use Map to dedupe by studio name

glowFiles.forEach(({ file, event }) => {
  const filePath = path.join(downloadsPath, file);
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`${event}:`);
    data.forEach(row => {
      // Handle multiple possible column names
      const studioName = row.Studio || row['Studio   '] || row['Studio Name'] || row.studio || null;
      const email = row.Email || row.email || row['Email Address'] || null;

      if (studioName && email) {
        // Normalize studio name
        const normalizedName = studioName.trim();

        // Store or update email for this studio
        if (!glowStudios.has(normalizedName)) {
          glowStudios.set(normalizedName, { name: normalizedName, email: email, events: [event] });
          console.log(`  ✅ ${normalizedName} | ${email}`);
        } else {
          // Studio exists, add event
          glowStudios.get(normalizedName).events.push(event);
        }
      } else if (studioName && !email) {
        console.log(`  ⚠️  ${studioName} | NO EMAIL`);
      }
    });
    console.log('');
  } catch (error) {
    console.log(`  ❌ ERROR reading ${file}: ${error.message}\n`);
  }
});

console.log(`\nTotal Glow studios with emails: ${glowStudios.size}\n`);

// Parse EMPWR CSV files
console.log('--- EMPWR STUDIOS ---\n');

const empwrFiles = [
  'Studio Data 2026 - CompSync - Sheet1 (1).csv',
  'Studio Data 2026 - CompSync - Sheet1.csv',
];

const empwrStudios = new Map();

empwrFiles.forEach(file => {
  const filePath = path.join(downloadsPath, file);
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`${file}:`);
    data.forEach(row => {
      // Check all possible column names for email
      const studioName = row.Studio || row['Studio Name'] || row.studio || null;
      const email = row.Email || row.email || row['Email Address'] ||
                    row['Studio Email'] || row['Contact Email'] || null;
      const contact = row.Contact || row['Contact Person'] || row['Contact Name'] || null;

      if (studioName) {
        const normalizedName = studioName.trim();

        if (email) {
          if (!empwrStudios.has(normalizedName)) {
            empwrStudios.set(normalizedName, { name: normalizedName, email: email, contact: contact });
            console.log(`  ✅ ${normalizedName} | ${email}${contact ? ` (${contact})` : ''}`);
          }
        } else {
          console.log(`  ⚠️  ${normalizedName} | NO EMAIL${contact ? ` (Contact: ${contact})` : ''}`);
        }
      }
    });
    console.log('');
  } catch (error) {
    console.log(`  ❌ ERROR reading ${file}: ${error.message}\n`);
  }
});

// Also try the Excel version
try {
  const filePath = path.join(downloadsPath, 'Studio Data 2026 - CompSync.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log('Studio Data 2026 - CompSync.xlsx:');
  data.forEach(row => {
    const studioName = row.Studio || row['Studio Name'] || row.studio || null;
    const email = row.Email || row.email || row['Email Address'] ||
                  row['Studio Email'] || row['Contact Email'] || null;
    const contact = row.Contact || row['Contact Person'] || row['Contact Name'] || null;

    if (studioName) {
      const normalizedName = studioName.trim();

      if (email) {
        if (!empwrStudios.has(normalizedName)) {
          empwrStudios.set(normalizedName, { name: normalizedName, email: email, contact: contact });
          console.log(`  ✅ ${normalizedName} | ${email}${contact ? ` (${contact})` : ''}`);
        }
      } else {
        console.log(`  ⚠️  ${normalizedName} | NO EMAIL${contact ? ` (Contact: ${contact})` : ''}`);
      }
    }
  });
  console.log('');
} catch (error) {
  console.log(`  ❌ ERROR reading Studio Data 2026 - CompSync.xlsx: ${error.message}\n`);
}

console.log(`\nTotal EMPWR studios with emails: ${empwrStudios.size}\n`);

// Generate SQL UPDATE statements
console.log('\n=== SQL UPDATE STATEMENTS ===\n');

console.log('-- GLOW STUDIOS --');
glowStudios.forEach(studio => {
  const escapedName = studio.name.replace(/'/g, "''");
  const escapedEmail = studio.email.replace(/'/g, "''");
  console.log(`UPDATE studios SET email = '${escapedEmail}' WHERE name = '${escapedName}' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';`);
});

console.log('\n-- EMPWR STUDIOS --');
empwrStudios.forEach(studio => {
  const escapedName = studio.name.replace(/'/g, "''");
  const escapedEmail = studio.email.replace(/'/g, "''");
  console.log(`UPDATE studios SET email = '${escapedEmail}' WHERE name = '${escapedName}' AND tenant_id = '00000000-0000-0000-0000-000000000001';`);
});

console.log('\n\n=== SUMMARY ===');
console.log(`Glow studios with emails: ${glowStudios.size}`);
console.log(`EMPWR studios with emails: ${empwrStudios.size}`);
console.log(`Total studios with emails: ${glowStudios.size + empwrStudios.size}`);
