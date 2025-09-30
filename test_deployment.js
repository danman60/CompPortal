/**
 * CompPortal Deployment Testing Script
 * Tests user journeys on deployed demo: https://beautiful-bonbon-cde2fe.netlify.app/
 */

const { chromium } = require('playwright');

const BASE_URL = 'https://beautiful-bonbon-cde2fe.netlify.app';

async function testDeployment() {
  console.log('🎭 Starting CompPortal Deployment Testing...\n');
  console.log(`🌐 Testing URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // Test 1: Homepage Load
    console.log('📄 Test 1: Homepage Load');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`   ✅ Page loaded: "${title}"`);
    results.passed.push('Homepage loads successfully');

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Test 2: Login Flow
    console.log('\n🔐 Test 2: Authentication Flow');

    // Look for login button
    const loginButton = await page.locator('button:has-text("Sign In"), button:has-text("Login"), a:has-text("Sign In")').first();
    if (await loginButton.isVisible()) {
      console.log('   ✅ Login button found');
      await loginButton.click();
      await page.waitForTimeout(1000);

      // Check if modal appeared
      const modalVisible = await page.locator('#login-modal').isVisible().catch(() => false);
      if (modalVisible) {
        console.log('   ✅ Login modal opened');
        results.passed.push('Login modal opens');

        // Test demo login
        const demoStudioButton = await page.locator('button:has-text("Studio Owner")').first();
        if (await demoStudioButton.isVisible()) {
          console.log('   ✅ Demo login buttons visible');
          await demoStudioButton.click();
          await page.waitForTimeout(1500);
          console.log('   ✅ Demo login completed');
          results.passed.push('Demo login works (Studio Owner)');
        }
      } else {
        console.log('   ⚠️  Login modal not found');
        results.warnings.push('Login modal structure may have changed');
      }
    } else {
      console.log('   ⚠️  Login button not immediately visible (may already be logged in)');
    }

    // Test 3: Navigation - Studios
    console.log('\n🏢 Test 3: Studios Page');
    await page.goto(`${BASE_URL}/studios.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const studiosTitle = await page.locator('h1, h2').filter({ hasText: /studio/i }).first().isVisible().catch(() => false);
    if (studiosTitle) {
      console.log('   ✅ Studios page loaded');
      results.passed.push('Studios page accessible');

      // Check for studio data
      const studioCards = await page.locator('.card, [class*="studio"]').count();
      console.log(`   📊 Found ${studioCards} studio elements`);
    } else {
      console.log('   ❌ Studios page failed to load properly');
      results.failed.push('Studios page not loading');
    }

    // Test 4: Navigation - Dancers
    console.log('\n💃 Test 4: Dancers Page');
    await page.goto(`${BASE_URL}/dancers.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const dancersTitle = await page.locator('h1, h2').filter({ hasText: /dancer/i }).first().isVisible().catch(() => false);
    if (dancersTitle) {
      console.log('   ✅ Dancers page loaded');
      results.passed.push('Dancers page accessible');

      // Check for dancers list
      const dancerRows = await page.locator('tbody tr, .dancer-card, [class*="dancer"]').count();
      console.log(`   📊 Found ${dancerRows} dancer elements`);

      // Test Add Dancer button
      const addButton = await page.locator('button:has-text("Add Dancer"), button:has-text("New Dancer")').first().isVisible().catch(() => false);
      if (addButton) {
        console.log('   ✅ Add Dancer button present');
        await page.locator('button:has-text("Add Dancer"), button:has-text("New Dancer")').first().click();
        await page.waitForTimeout(1000);

        const modal = await page.locator('[role="dialog"], .modal, #addDancerModal').isVisible().catch(() => false);
        if (modal) {
          console.log('   ✅ Add Dancer modal opens');
          results.passed.push('Add Dancer modal functional');

          // Close modal
          await page.keyboard.press('Escape');
        }
      }
    } else {
      console.log('   ❌ Dancers page failed to load properly');
      results.failed.push('Dancers page not loading');
    }

    // Test 5: Navigation - Reservations
    console.log('\n📋 Test 5: Reservations Page');
    await page.goto(`${BASE_URL}/reservations.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const reservationsTitle = await page.locator('h1, h2').filter({ hasText: /reservation/i }).first().isVisible().catch(() => false);
    if (reservationsTitle) {
      console.log('   ✅ Reservations page loaded');
      results.passed.push('Reservations page accessible');
    } else {
      console.log('   ❌ Reservations page failed to load properly');
      results.failed.push('Reservations page not loading');
    }

    // Test 6: Navigation - Reports
    console.log('\n📊 Test 6: Reports Page');
    await page.goto(`${BASE_URL}/reports.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const reportsTitle = await page.locator('h1, h2').filter({ hasText: /report|schedule/i }).first().isVisible().catch(() => false);
    if (reportsTitle) {
      console.log('   ✅ Reports page loaded');
      results.passed.push('Reports page accessible');
    } else {
      console.log('   ❌ Reports page failed to load properly');
      results.failed.push('Reports page not loading');
    }

    // Test 7: Mobile Responsiveness
    console.log('\n📱 Test 7: Mobile Responsiveness');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const mobileNav = await page.locator('[class*="mobile"], button[class*="menu"]').isVisible().catch(() => false);
    console.log(`   ${mobileNav ? '✅' : '⚠️'} Mobile navigation ${mobileNav ? 'detected' : 'not immediately visible'}`);

    if (mobileNav) {
      results.passed.push('Mobile navigation present');
    } else {
      results.warnings.push('Mobile navigation may need review');
    }

    // Test 8: Check for JavaScript errors
    console.log('\n🐛 Test 8: JavaScript Errors Check');
    if (errors.length > 0) {
      console.log(`   ⚠️  Found ${errors.length} console errors:`);
      errors.slice(0, 5).forEach(err => console.log(`      - ${err}`));
      results.warnings.push(`${errors.length} console errors detected`);
    } else {
      console.log('   ✅ No JavaScript errors detected');
      results.passed.push('No console errors');
    }

    // Test 9: Performance Check
    console.log('\n⚡ Test 9: Performance Check');
    await page.goto(BASE_URL);
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: perfData.loadEventEnd - perfData.fetchStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        responseTime: perfData.responseEnd - perfData.requestStart
      };
    });

    console.log(`   📊 Load Time: ${(performanceMetrics.loadTime / 1000).toFixed(2)}s`);
    console.log(`   📊 DOM Content Loaded: ${(performanceMetrics.domContentLoaded / 1000).toFixed(2)}s`);
    console.log(`   📊 Response Time: ${(performanceMetrics.responseTime / 1000).toFixed(2)}s`);

    if (performanceMetrics.loadTime < 3000) {
      console.log('   ✅ Performance is good (< 3s load time)');
      results.passed.push('Good performance metrics');
    } else {
      console.log('   ⚠️  Page load time is slow (> 3s)');
      results.warnings.push('Page load time could be improved');
    }

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    results.failed.push(`Test execution error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Print Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`\n✅ Passed: ${results.passed.length}`);
  results.passed.forEach(item => console.log(`   ✓ ${item}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(item => console.log(`   ⚠ ${item}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(item => console.log(`   ✗ ${item}`));
  }

  console.log('\n' + '='.repeat(70));

  const totalTests = results.passed.length + results.failed.length + results.warnings.length;
  const successRate = ((results.passed.length / totalTests) * 100).toFixed(1);
  console.log(`\n🎯 Overall Success Rate: ${successRate}%`);
  console.log(`📝 Total Tests: ${totalTests} (${results.passed.length} passed, ${results.failed.length} failed, ${results.warnings.length} warnings)`);
  console.log('='.repeat(70));

  return {
    success: results.failed.length === 0,
    results
  };
}

// Run tests
testDeployment().then(({ success }) => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});
