const XLSX = require('xlsx');

const files = [
  { file: 'april 9-12 st catharines.xlsx', col: 'Studio   ' },
  { file: 'april 23-26th blue mountain.xlsx', col: 'Studio' },
  { file: 'toronto may 8-10.xlsx', col: 'Studio' },
  { file: 'june 4-7 blue mountain.xlsx', col: 'Studio' }
];

console.log('=== ALL GLOW EMAILS ===\n');
const allEmails = [];

files.forEach(({ file, col }) => {
  const wb = XLSX.readFile('C:/Users/Danie/Downloads/' + file);
  const sh = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sh);

  data.forEach(row => {
    const studio = row[col] || row['Studio'] || row['Studio   '];
    const email = row.Email || row.email;
    if (studio && email) {
      allEmails.push({ name: studio, email });
      console.log(`  ${studio} | ${email}`);
    }
  });
});

console.log(`\nTotal: ${allEmails.length} studios\n\n=== SQL UPDATES ===\n`);
allEmails.forEach(s => {
  const name = s.name.replace(/'/g, "''");
  const email = s.email.replace(/'/g, "''");
  console.log(`UPDATE studios SET email = '${email}' WHERE name = '${name}' AND tenant_id = '4b9c1713-40ab-460b-8dda-5a8cf6cbc9b5';`);
});
