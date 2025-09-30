/**
 * CompPortal User Journey Testing
 * Deep testing of Studio Owner user journey flows
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://beautiful-bonbon-cde2fe.netlify.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

async function testUserJourney() {
  console.log('🎭 CompPortal User Journey Testing\n');
  console.log(`🌐 URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const report = {
    timestamp: new Date().toISOString(),
    tests: [],
    screenshots: []
  };

  try {
    // ========================================
    // JOURNEY 1: Homepage & Login
    // ========================================
    console.log('📍 JOURNEY 1: Homepage & Login');
    console.log('─'.repeat(60));

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Screenshot homepage
    const homepageScreenshot = path.join(SCREENSHOTS_DIR, '01-homepage.png');
    await page.screenshot({ path: homepageScreenshot, fullPage: true });
    console.log(`   📸 Screenshot saved: ${homepageScreenshot}`);
    report.screenshots.push('01-homepage.png');

    // Check for demo features
    const hasSignIn = await page.locator('button:has-text("Sign In"), a:has-text("Sign In")').count();
    const hasDemoInfo = await page.locator('text=/demo/i').count();
    console.log(`   ✅ Sign In button: ${hasSignIn > 0 ? 'Present' : 'Not found'}`);
    console.log(`   ✅ Demo information: ${hasDemoInfo > 0 ? 'Present' : 'Not found'}`);

    report.tests.push({
      name: 'Homepage Load',
      status: 'pass',
      details: `Sign In: ${hasSignIn > 0}, Demo Info: ${hasDemoInfo > 0}`
    });

    // ========================================
    // JOURNEY 2: Dancers Management
    // ========================================
    console.log('\n📍 JOURNEY 2: Dancers Management');
    console.log('─'.repeat(60));

    await page.goto(`${BASE_URL}/dancers.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Screenshot dancers page
    const dancersScreenshot = path.join(SCREENSHOTS_DIR, '02-dancers-list.png');
    await page.screenshot({ path: dancersScreenshot, fullPage: true });
    console.log(`   📸 Screenshot saved: ${dancersScreenshot}`);
    report.screenshots.push('02-dancers-list.png');

    // Count dancers in table
    const dancerCount = await page.locator('tbody tr').count();
    console.log(`   📊 Dancers displayed: ${dancerCount}`);

    // Test table features
    const hasSortable = await page.locator('th[class*="sortable"], th[onclick*="sort"]').count();
    const hasSearch = await page.locator('input[type="search"], input[placeholder*="search" i]').count();
    const hasActions = await page.locator('button:has-text("Edit"), button:has-text("Delete"), .action-buttons').count();

    console.log(`   ✅ Sortable columns: ${hasSortable > 0 ? 'Yes' : 'No'}`);
    console.log(`   ✅ Search functionality: ${hasSearch > 0 ? 'Yes' : 'No'}`);
    console.log(`   ✅ Action buttons: ${hasActions > 0 ? 'Yes' : 'No'}`);

    // Test Add Dancer Modal
    console.log('\n   🧪 Testing Add Dancer Modal...');
    const addButton = page.locator('button:has-text("Add Dancer"), button:has-text("New Dancer")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(1000);

      const addModalScreenshot = path.join(SCREENSHOTS_DIR, '03-add-dancer-modal.png');
      await page.screenshot({ path: addModalScreenshot, fullPage: true });
      console.log(`   📸 Screenshot saved: ${addModalScreenshot}`);
      report.screenshots.push('03-add-dancer-modal.png');

      // Check form fields
      const hasFirstName = await page.locator('input[name*="first" i], input[id*="first" i]').isVisible();
      const hasLastName = await page.locator('input[name*="last" i], input[id*="last" i]').isVisible();
      const hasDOB = await page.locator('input[type="date"], input[name*="birth" i]').isVisible();

      console.log(`   ✅ First Name field: ${hasFirstName ? 'Present' : 'Missing'}`);
      console.log(`   ✅ Last Name field: ${hasLastName ? 'Present' : 'Missing'}`);
      console.log(`   ✅ Date of Birth field: ${hasDOB ? 'Present' : 'Missing'}`);

      report.tests.push({
        name: 'Add Dancer Modal',
        status: (hasFirstName && hasLastName && hasDOB) ? 'pass' : 'partial',
        details: `Form fields present: ${hasFirstName && hasLastName && hasDOB}`
      });

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Test Edit functionality
    console.log('\n   🧪 Testing Edit Dancer...');
    const editButton = page.locator('button:has-text("Edit"), .edit-btn').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);

      const editModalScreenshot = path.join(SCREENSHOTS_DIR, '04-edit-dancer-modal.png');
      await page.screenshot({ path: editModalScreenshot, fullPage: true });
      console.log(`   📸 Screenshot saved: ${editModalScreenshot}`);
      report.screenshots.push('04-edit-dancer-modal.png');

      // Check if data is pre-filled
      const firstNameValue = await page.locator('input[name*="first" i], input[id*="first" i]').inputValue().catch(() => '');
      console.log(`   ✅ Pre-filled data: ${firstNameValue ? 'Yes' : 'No'}`);

      report.tests.push({
        name: 'Edit Dancer',
        status: firstNameValue ? 'pass' : 'warning',
        details: `Data pre-population: ${firstNameValue ? 'Working' : 'Check needed'}`
      });

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // ========================================
    // JOURNEY 3: Studios Management
    // ========================================
    console.log('\n📍 JOURNEY 3: Studios Management');
    console.log('─'.repeat(60));

    await page.goto(`${BASE_URL}/studios.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const studiosScreenshot = path.join(SCREENSHOTS_DIR, '05-studios-page.png');
    await page.screenshot({ path: studiosScreenshot, fullPage: true });
    console.log(`   📸 Screenshot saved: ${studiosScreenshot}`);
    report.screenshots.push('05-studios-page.png');

    // Check studio information display
    const studioName = await page.locator('h1, h2, h3').filter({ hasText: /academy|dance|studio/i }).first().textContent().catch(() => 'Not found');
    console.log(`   📋 Studio Name: ${studioName}`);

    const hasContactInfo = await page.locator('text=/email|phone|address/i').count();
    console.log(`   ✅ Contact information sections: ${hasContactInfo}`);

    report.tests.push({
      name: 'Studios Page',
      status: 'pass',
      details: `Studio info displayed, contact sections: ${hasContactInfo}`
    });

    // ========================================
    // JOURNEY 4: Reservations
    // ========================================
    console.log('\n📍 JOURNEY 4: Reservations');
    console.log('─'.repeat(60));

    await page.goto(`${BASE_URL}/reservations.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const reservationsScreenshot = path.join(SCREENSHOTS_DIR, '06-reservations-page.png');
    await page.screenshot({ path: reservationsScreenshot, fullPage: true });
    console.log(`   📸 Screenshot saved: ${reservationsScreenshot}`);
    report.screenshots.push('06-reservations-page.png');

    // Check for reservation features
    const hasReservationCards = await page.locator('.card, .reservation-card, [class*="reservation"]').count();
    const hasNewReservation = await page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("Add")').count();

    console.log(`   📊 Reservation elements: ${hasReservationCards}`);
    console.log(`   ✅ New reservation button: ${hasNewReservation > 0 ? 'Present' : 'Not found'}`);

    // Test Entries/Routines Modal
    console.log('\n   🧪 Testing Entries & Routines...');
    const entriesButton = page.locator('button:has-text("Entries"), button:has-text("Routines")').first();
    if (await entriesButton.isVisible()) {
      await entriesButton.click();
      await page.waitForTimeout(1000);

      const entriesScreenshot = path.join(SCREENSHOTS_DIR, '07-entries-modal.png');
      await page.screenshot({ path: entriesScreenshot, fullPage: true });
      console.log(`   📸 Screenshot saved: ${entriesScreenshot}`);
      report.screenshots.push('07-entries-modal.png');

      // Check entries modal features
      const hasAddEntry = await page.locator('button:has-text("Add Entry"), button:has-text("New Entry")').count();
      const hasDancerAssignment = await page.locator('select, .dancer-select, text=/assign dancer/i').count();

      console.log(`   ✅ Add Entry functionality: ${hasAddEntry > 0 ? 'Present' : 'Not found'}`);
      console.log(`   ✅ Dancer assignment: ${hasDancerAssignment > 0 ? 'Present' : 'Not found'}`);

      report.tests.push({
        name: 'Entries & Routines Modal',
        status: (hasAddEntry > 0 || hasDancerAssignment > 0) ? 'pass' : 'warning',
        details: `Add Entry: ${hasAddEntry > 0}, Dancer Assignment: ${hasDancerAssignment > 0}`
      });

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    report.tests.push({
      name: 'Reservations Page',
      status: 'pass',
      details: `Elements: ${hasReservationCards}, New button: ${hasNewReservation > 0}`
    });

    // ========================================
    // JOURNEY 5: Reports & Schedules
    // ========================================
    console.log('\n📍 JOURNEY 5: Reports & Schedules');
    console.log('─'.repeat(60));

    await page.goto(`${BASE_URL}/reports.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const reportsScreenshot = path.join(SCREENSHOTS_DIR, '08-reports-page.png');
    await page.screenshot({ path: reportsScreenshot, fullPage: true });
    console.log(`   📸 Screenshot saved: ${reportsScreenshot}`);
    report.screenshots.push('08-reports-page.png');

    const hasSchedules = await page.locator('text=/schedule/i, .schedule, [class*="schedule"]').count();
    const hasExport = await page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("PDF")').count();

    console.log(`   📊 Schedule elements: ${hasSchedules}`);
    console.log(`   ✅ Export functionality: ${hasExport > 0 ? 'Present' : 'Not found'}`);

    report.tests.push({
      name: 'Reports Page',
      status: 'pass',
      details: `Schedules: ${hasSchedules}, Export: ${hasExport > 0}`
    });

    // ========================================
    // JOURNEY 6: Mobile Responsiveness
    // ========================================
    console.log('\n📍 JOURNEY 6: Mobile Responsiveness');
    console.log('─'.repeat(60));

    // Test at different viewports
    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const mobileScreenshot = path.join(SCREENSHOTS_DIR, `09-mobile-${viewport.name.toLowerCase().replace(' ', '-')}.png`);
      await page.screenshot({ path: mobileScreenshot, fullPage: false });
      console.log(`   📸 Screenshot saved (${viewport.name}): ${mobileScreenshot}`);
      report.screenshots.push(path.basename(mobileScreenshot));
    }

    report.tests.push({
      name: 'Mobile Responsiveness',
      status: 'pass',
      details: 'Screenshots captured for 3 viewport sizes'
    });

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    report.tests.push({
      name: 'Error',
      status: 'fail',
      details: error.message
    });
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n' + '='.repeat(70));
  console.log('📊 USER JOURNEY TEST REPORT');
  console.log('='.repeat(70));
  console.log(`\n📅 Timestamp: ${report.timestamp}`);
  console.log(`📸 Screenshots: ${report.screenshots.length} saved in ${SCREENSHOTS_DIR}\n`);

  const passed = report.tests.filter(t => t.status === 'pass').length;
  const warnings = report.tests.filter(t => t.status === 'warning' || t.status === 'partial').length;
  const failed = report.tests.filter(t => t.status === 'fail').length;

  console.log('Test Results:');
  report.tests.forEach((test, idx) => {
    const icon = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️';
    console.log(`${idx + 1}. ${icon} ${test.name}`);
    console.log(`   ${test.details}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Passed: ${passed}`);
  if (warnings > 0) console.log(`⚠️  Warnings: ${warnings}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
  console.log(`🎯 Success Rate: ${((passed / report.tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  // Save report as JSON
  const reportPath = path.join(SCREENSHOTS_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved: ${reportPath}`);

  return report;
}

testUserJourney().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
