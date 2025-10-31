const XLSX = require('xlsx');
const path = require('path');

const downloadsPath = 'C:/Users/Danie/Downloads';

console.log('=== GLOW STUDIO EMAILS ===\n');

const glowFiles = [
  { file: 'april 9-12 st catharines.xlsx', event: 'St. Catharines Spring' },
  { file: 'april 23-26th blue mountain.xlsx', event: 'Blue Mountain Spring' },
  { file: 'toronto may 8-10.xlsx', event: 'Toronto' },
  { file: 'june 4-7 blue mountain.xlsx', event: 'Blue Mountain Summer' },
];

const allStudios = [];

glowFiles.forEach(({ file, event }) => {
  const filePath = path.join(downloadsPath, file);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`${event}:`);
  data.forEach(row => {
    const studioName = row.Studio || row['Studio Name'] || row.studio || null;
    const email = row.Email || row.email || row['Email Address'] || null;

    if (studioName && email) {
      allStudios.push({
        name: studioName,
        email: email,
        event: event
      });
      console.log(`  ✅ ${studioName} | ${email}`);
    } else if (studioName) {
      console.log(`  ⚠️  ${studioName} | NO EMAIL`);
    } else {
      console.log(`  ❌ MISSING STUDIO NAME | Email: ${email || 'MISSING'}`);
    }
  });
  console.log('');
});

console.log('\n=== SQL UPDATE STATEMENTS (Glow) ===\n');

allStudios.forEach(s => {
  const escapedName = s.name.replace(/'/g, "''");
  const escapedEmail = s.email.replace(/'/g, "''");
  console.log(`UPDATE studios SET email = '${escapedEmail}' WHERE name = '${escapedName}' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';`);
});

console.log(`\n\nTotal Glow studios with emails: ${allStudios.length}`);
