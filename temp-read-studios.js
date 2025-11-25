const XLSX = require('xlsx');

const files = [
  'C:\\Users\\Danie\\Downloads\\april 9-12 st catharines (1).xlsx',
  'C:\\Users\\Danie\\Downloads\\june 4-7 blue mountain (1).xlsx',
  'C:\\Users\\Danie\\Downloads\\april 23-26th blue mountain (1).xlsx',
  'C:\\Users\\Danie\\Downloads\\toronto may 8-10 (1).xlsx',
  'C:\\Users\\Danie\\Downloads\\may 14-17 st catharines (1).xlsx'
];

const allStudios = new Set();
const fileDetails = [];

files.forEach(file => {
  try {
    const workbook = XLSX.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const fileName = file.split('\\').pop();

    console.log(`\n📄 File: ${fileName}`);
    console.log(`   Rows: ${data.length}`);

    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`   Columns: ${columns.join(', ')}`);

      // Look for studio column
      const studioColumn = columns.find(col =>
        col.toLowerCase().includes('studio')
      );

      if (studioColumn) {
        const studios = [...new Set(data.map(row => row[studioColumn]).filter(Boolean))];
        console.log(`   Studio column: "${studioColumn}"`);
        console.log(`   Unique studios: ${studios.length}`);

        fileDetails.push({
          file: fileName,
          studios: studios
        });

        studios.forEach(studio => allStudios.add(studio));
      } else {
        console.log('   ⚠️  No studio column found');
      }
    }
  } catch (err) {
    console.error(`Error reading ${file}: ${err.message}`);
  }
});

console.log(`\n\n📊 TOTAL UNIQUE STUDIOS: ${allStudios.size}`);
console.log('\n' + '='.repeat(60));
console.log('ALL STUDIOS (sorted):');
console.log('='.repeat(60));

const sortedStudios = [...allStudios].sort();
sortedStudios.forEach((studio, i) => {
  console.log(`${(i + 1).toString().padStart(3)}. ${studio}`);
});

// Output JSON for further processing
console.log('\n\n' + '='.repeat(60));
console.log('JSON OUTPUT:');
console.log('='.repeat(60));
console.log(JSON.stringify(sortedStudios, null, 2));
