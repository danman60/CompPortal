// Studios from Excel files
const excelStudios = [
  "Body Lines Dance & Fitness",
  "CDA",
  "Cassiahs Dance Company",
  "Dancecore",
  "Dancemakers",
  "Danceology",
  "Dancepirations",
  "Dancesations",
  "Dancetastic",
  "Dancing Angels",
  "Expressions Dance",
  "Fame School",
  "Fever",
  "Goddards",
  "Impact Dance Complex",
  "JDanse",
  "Kingston Dance Force",
  "Legacy Acro",
  "Mariposa",
  "NJADS",
  "Northern Lights",
  "Peak Dance Company",
  "Poise Dance Academy",
  "Precisions",
  "Prodigy Dance",
  "Pure Energy ",  // Note: has trailing space
  "Rebel",
  "Rebel Dance Company (think she is in two locations but only is supposed to be in 1 will figure out and email you the correct location for her tomorrow)",
  "Sabuccos",
  "Steppin Up",
  "Studio 519",
  "TK",
  "Taylors Dance",
  "The Dance Extension",
  "Uxbridge"
];

// Studios from database (Glow tenant)
const dbStudios = [
  "Cassiahs Dance Company",
  "CDA",
  "Dancecore",
  "Dancemakers",
  "Danceology",
  "Dancepirations",
  "Dancesations",
  "Dancetastic",
  "Dancing Angels",
  "DJAGlowTester",
  "Elite Star Dance Academy",
  "Expressions Dance",
  "Fame School",
  "Fever",
  "Goddards",
  "Impact Dance Complex",
  "JDanse",
  "Kingston Dance Force",
  "Legacy Acro",
  "Mariposa",
  "Miss Dar's School of Dance",
  "NJADS",
  "Northern Lights",
  "Poise Dance Academy",
  "Precisions",
  "Prodigy Dance",
  "Pure Energy",
  "Rebel",
  "Sabuccos",
  "Studio 519",
  "Taylor's Dance Academy",
  "The Dance Extension",
  "TK",
  "Uxbridge"
];

// Normalize function to handle minor differences
function normalize(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")  // Normalize apostrophes
    .replace(/\s+/g, ' ');  // Normalize spaces
}

// Create normalized maps
const excelNormalized = new Map(
  excelStudios.map(name => [normalize(name), name])
);

const dbNormalized = new Map(
  dbStudios.map(name => [normalize(name), name])
);

// Find missing studios
const missing = [];
const ambiguous = [];

excelStudios.forEach(excelName => {
  const normalized = normalize(excelName);

  if (!dbNormalized.has(normalized)) {
    // Check for partial matches
    const partialMatch = Array.from(dbNormalized.keys()).find(dbNorm => {
      const excelWords = normalized.split(' ').filter(w => w.length > 2);
      const dbWords = dbNorm.split(' ').filter(w => w.length > 2);

      // If most significant words match, it's likely the same studio
      const matchCount = excelWords.filter(word =>
        dbWords.some(dbWord => dbWord.includes(word) || word.includes(dbWord))
      ).length;

      return matchCount >= Math.min(excelWords.length, dbWords.length) * 0.7;
    });

    if (partialMatch) {
      ambiguous.push({
        excel: excelName,
        db: dbNormalized.get(partialMatch),
        reason: 'Possible name variation'
      });
    } else {
      missing.push(excelName);
    }
  }
});

// Find extras in DB (not in Excel)
const extras = [];
dbStudios.forEach(dbName => {
  const normalized = normalize(dbName);
  if (!excelNormalized.has(normalized)) {
    extras.push(dbName);
  }
});

console.log('=' .repeat(80));
console.log('STUDIO COMPARISON REPORT');
console.log('='.repeat(80));
console.log();
console.log(`📊 Excel Studios: ${excelStudios.length}`);
console.log(`📊 Database Studios: ${dbStudios.length}`);
console.log();

if (missing.length > 0) {
  console.log('❌ MISSING FROM DATABASE (' + missing.length + '):');
  console.log('='.repeat(80));
  missing.forEach((name, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${name}`);
  });
  console.log();
}

if (ambiguous.length > 0) {
  console.log('⚠️  POSSIBLE NAME VARIATIONS (' + ambiguous.length + '):');
  console.log('='.repeat(80));
  ambiguous.forEach((item, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. Excel: "${item.excel}"`);
    console.log(`    DB:    "${item.db}"`);
    console.log(`    Reason: ${item.reason}`);
    console.log();
  });
}

if (extras.length > 0) {
  console.log('➕ IN DATABASE BUT NOT IN EXCEL FILES (' + extras.length + '):');
  console.log('='.repeat(80));
  extras.forEach((name, i) => {
    console.log(`${(i + 1).toString().padStart(2)}. ${name}`);
  });
  console.log();
}

// Summary
console.log('='.repeat(80));
console.log('SUMMARY:');
console.log('='.repeat(80));
console.log(`Definitely Missing: ${missing.length}`);
console.log(`Possible Variations: ${ambiguous.length}`);
console.log(`Extra in DB: ${extras.length}`);
console.log();

if (missing.length === 0 && ambiguous.length === 0) {
  console.log('✅ All Excel studios are in the database!');
} else {
  console.log(`⚠️  ${missing.length + ambiguous.length} studios need review`);
}
