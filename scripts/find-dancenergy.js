const XLSX = require('xlsx');

const wb = XLSX.readFile('C:/Users/Danie/Downloads/Studio Data 2026 - CompSync.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(sheet['!ref']);

console.log('Looking for DANCENERGY in Excel file...\n');

for (let R = range.s.r; R <= range.e.r; R++) {
  const cellA = sheet[XLSX.utils.encode_cell({r: R, c: 0})];
  if (cellA && cellA.v && typeof cellA.v === 'string' && cellA.v.includes('DANCENERGY')) {
    console.log(`Found DANCENERGY at row ${R+1}:`);
    for (let C = 0; C <= 8; C++) {
      const cell = sheet[XLSX.utils.encode_cell({r: R, c: C})];
      if (cell) {
        console.log(`  Col ${XLSX.utils.encode_col(C)}: ${cell.v}`);
      }
    }
    break;
  }
}

// Also check CSV
console.log('\n\nChecking CSV file...\n');
const csv = XLSX.readFile('C:/Users/Danie/Downloads/Studio Data 2026 - CompSync - Sheet1 (1).csv');
const csvSheet = csv.Sheets[csv.SheetNames[0]];
const csvData = XLSX.utils.sheet_to_json(csvSheet);

csvData.forEach((row, i) => {
  if (row.__EMPTY && row.__EMPTY.includes('DANCENERGY')) {
    console.log(`Found at row ${i}:`);
    console.log('  Studio:', row.__EMPTY);
    console.log('  SD Name:', row.__EMPTY_1);
    console.log('  Email:', row.__EMPTY_2);
    console.log('  Entries:', row.__EMPTY_3);
  }
});
