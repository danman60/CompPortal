const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const downloadsPath = 'C:/Users/Danie/Downloads';

const files = [
  'Studio Data 2026 - CompSync.xlsx',
  'toronto may 8-10.xlsx'
];

console.log('Reading EMPWR client data files...\n');

files.forEach(filename => {
  const filePath = path.join(downloadsPath, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filename}\n`);
    return;
  }

  console.log(`\n📄 File: ${filename}`);
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(filePath);

    workbook.SheetNames.forEach((sheetName, idx) => {
      console.log(`\n  Sheet ${idx + 1}: ${sheetName}`);
      console.log('  ' + '-'.repeat(76));

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`  Rows: ${data.length}`);

      if (data.length > 0) {
        console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
        console.log(`\n  Sample row 1:`);
        console.log('  ', JSON.stringify(data[0], null, 2).split('\n').join('\n  '));

        if (data.length > 1) {
          console.log(`\n  Sample row 2:`);
          console.log('  ', JSON.stringify(data[1], null, 2).split('\n').join('\n  '));
        }
      }
    });

  } catch (error) {
    console.log(`  ❌ Error reading file: ${error.message}`);
  }

  console.log('\n');
});
