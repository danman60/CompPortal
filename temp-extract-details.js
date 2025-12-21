const XLSX = require('xlsx');

const files = [
  { path: 'C:\\Users\\Danie\\Downloads\\april 9-12 st catharines (1).xlsx', event: 'St Catharines April 9-12' },
  { path: 'C:\\Users\\Danie\\Downloads\\june 4-7 blue mountain (1).xlsx', event: 'Blue Mountain June 4-7' },
  { path: 'C:\\Users\\Danie\\Downloads\\april 23-26th blue mountain (1).xlsx', event: 'Blue Mountain April 23-26' },
  { path: 'C:\\Users\\Danie\\Downloads\\toronto may 8-10 (1).xlsx', event: 'Toronto May 8-10' },
  { path: 'C:\\Users\\Danie\\Downloads\\may 14-17 st catharines (1).xlsx', event: 'St Catharines May 14-17' }
];

const targetStudios = [
  'Body Lines Dance & Fitness',
  'Peak Dance Company',
  'Rebel Dance Company',
  'Steppin Up'
];

const results = [];

files.forEach(file => {
  try {
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const studioColumn = columns.find(col => col.toLowerCase().includes('studio'));

    if (!studioColumn) return;

    // Find rows for target studios
    targetStudios.forEach(targetStudio => {
      const rows = data.filter(row => {
        const studioName = row[studioColumn];
        if (!studioName) return false;

        // Normalize for comparison
        const normalized = studioName.toLowerCase().trim();
        const targetNormalized = targetStudio.toLowerCase().trim();

        return normalized === targetNormalized ||
               normalized.includes(targetNormalized) ||
               targetNormalized.includes(normalized);
      });

      rows.forEach(row => {
        results.push({
          studio: targetStudio,
          event: file.event,
          data: row,
          columns: columns
        });
      });
    });

  } catch (err) {
    console.error(`Error reading ${file.path}: ${err.message}`);
  }
});

console.log('='.repeat(80));
console.log('MISSING STUDIOS - RESERVATION DETAILS');
console.log('='.repeat(80));
console.log();

if (results.length === 0) {
  console.log('⚠️  No data found for missing studios');
} else {
  targetStudios.forEach(studio => {
    const studioResults = results.filter(r => r.studio === studio);

    if (studioResults.length === 0) {
      console.log(`\n❌ ${studio}: No data found`);
      return;
    }

    console.log(`\n✅ ${studio}:`);
    console.log('─'.repeat(80));

    studioResults.forEach(result => {
      console.log(`\n  Event: ${result.event}`);
      console.log(`  Columns: ${result.columns.join(', ')}`);
      console.log(`\n  Data:`);
      Object.keys(result.data).forEach(key => {
        console.log(`    ${key}: ${result.data[key]}`);
      });
    });
  });
}

// JSON output
console.log('\n\n' + '='.repeat(80));
console.log('JSON OUTPUT:');
console.log('='.repeat(80));
console.log(JSON.stringify(results, null, 2));
