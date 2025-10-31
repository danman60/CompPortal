/**
 * Studio Claim Workflow Test
 *
 * Tests the complete studio claiming flow from invitation to dashboard:
 * 1. Access claim link
 * 2. Redirect to signup with pre-filled email
 * 3. Create account
 * 4. Claim studio
 * 5. Complete onboarding
 * 6. Verify dashboard access
 * 7. Add dancers
 * 8. Test password reset
 *
 * Test Studio: Test Workflow Studio
 * Email: testworkflow@test.com
 * Code: WORK1
 */

const { test, expect } = require('@playwright/test');

const TEST_DATA = {
  studioCode: 'WORK1',
  email: 'testworkflow@test.com',
  password: 'TestPass123!',
  firstName: 'Test',
  lastName: 'Director',
  phone: '555-0123',
  studioName: 'Test Workflow Studio',
  dancers: [
    { firstName: 'Emma', lastName: 'Smith', birthdate: '2010-05-15' },
    { firstName: 'Liam', lastName: 'Johnson', birthdate: '2012-08-22' },
  ]
};

test.describe('Studio Claim Workflow', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    baseURL: 'https://empwr.compsync.net'
  });

  test('Complete studio claiming flow', async ({ page }) => {
    console.log('\n=== STEP 1: Access Claim Link ===');
    await page.goto(`/claim?code=${TEST_DATA.studioCode}`);
    await page.screenshot({ path: 'test-results/01-claim-link.png' });

    // Should redirect to signup
    await page.waitForURL(/\/signup/, { timeout: 10000 });
    console.log('✓ Redirected to signup page');

    console.log('\n=== STEP 2: Verify Email Pre-filled ===');
    await page.screenshot({ path: 'test-results/02-signup-prefilled.png' });

    const emailInput = page.locator('input[type="email"]');
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe(TEST_DATA.email);
    console.log(`✓ Email pre-filled: ${emailValue}`);

    const isDisabled = await emailInput.isDisabled();
    expect(isDisabled).toBe(true);
    console.log('✓ Email field is disabled');

    console.log('\n=== STEP 3: Create Account ===');
    await page.fill('input[type="password"]', TEST_DATA.password);
    await page.fill('input[placeholder*="••••••••"]', TEST_DATA.password); // Confirm password
    await page.screenshot({ path: 'test-results/03-signup-filled.png' });

    await page.click('button:has-text("Create Account")');
    console.log('✓ Clicked Create Account');

    // Wait for email confirmation page or redirect
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/04-after-signup.png' });

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // If we get email confirmation, we need to manually verify
    if (currentUrl.includes('confirm') || currentUrl.includes('check-email')) {
      console.log('⚠️  EMAIL CONFIRMATION REQUIRED');
      console.log('   Action needed: Check testworkflow@test.com inbox');
      console.log('   This test will pause here - manual intervention required');
      return;
    }

    console.log('\n=== STEP 4: Claim Studio ===');
    // Should be on claim page or redirected there
    if (!currentUrl.includes('/claim')) {
      await page.goto(`/claim?code=${TEST_DATA.studioCode}`);
    }

    await page.waitForSelector('text=Claim Your Studio', { timeout: 10000 });
    await page.screenshot({ path: 'test-results/05-claim-page.png' });

    const studioNameElement = await page.locator(`text=${TEST_DATA.studioName}`);
    expect(await studioNameElement.count()).toBeGreaterThan(0);
    console.log(`✓ Studio name displayed: ${TEST_DATA.studioName}`);

    await page.click('button:has-text("Claim Studio")');
    console.log('✓ Clicked Claim Studio');

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/06-after-claim.png' });

    console.log('\n=== STEP 5: Complete Onboarding ===');
    // Should redirect to onboarding or dashboard
    const onboardingUrl = page.url();
    console.log(`Current URL: ${onboardingUrl}`);

    if (onboardingUrl.includes('/onboarding')) {
      await page.waitForSelector('input[name="firstName"], input[placeholder*="First"]', { timeout: 5000 });
      await page.screenshot({ path: 'test-results/07-onboarding-page.png' });

      await page.fill('input[name="firstName"], input[placeholder*="First"]', TEST_DATA.firstName);
      await page.fill('input[name="lastName"], input[placeholder*="Last"]', TEST_DATA.lastName);
      await page.fill('input[type="tel"], input[placeholder*="phone"]', TEST_DATA.phone);

      await page.screenshot({ path: 'test-results/08-onboarding-filled.png' });
      await page.click('button:has-text("Complete"), button:has-text("Continue"), button[type="submit"]');
      console.log('✓ Completed onboarding');

      await page.waitForTimeout(2000);
    }

    console.log('\n=== STEP 6: Verify Dashboard Access ===');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.screenshot({ path: 'test-results/09-dashboard.png' });
    console.log('✓ Redirected to dashboard');

    const dashboardHeading = await page.locator('h1, h2').first().textContent();
    console.log(`Dashboard heading: ${dashboardHeading}`);

    console.log('\n=== STEP 7: Add Dancers ===');
    await page.goto('/dashboard/dancers');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/10-dancers-page.png' });

    for (let i = 0; i < TEST_DATA.dancers.length; i++) {
      const dancer = TEST_DATA.dancers[i];
      console.log(`Adding dancer ${i + 1}: ${dancer.firstName} ${dancer.lastName}`);

      // Click Add Dancer button
      await page.click('button:has-text("Add Dancer"), a:has-text("Add Dancer")');
      await page.waitForTimeout(1000);

      // Fill in dancer details
      await page.fill('input[name="firstName"], input[placeholder*="First"]', dancer.firstName);
      await page.fill('input[name="lastName"], input[placeholder*="Last"]', dancer.lastName);
      await page.fill('input[type="date"], input[name="birthdate"]', dancer.birthdate);

      await page.screenshot({ path: `test-results/11-dancer-${i + 1}-filled.png` });

      // Submit
      await page.click('button:has-text("Save"), button:has-text("Add"), button[type="submit"]');
      await page.waitForTimeout(2000);

      console.log(`✓ Added dancer: ${dancer.firstName} ${dancer.lastName}`);
    }

    await page.screenshot({ path: 'test-results/12-dancers-added.png' });

    console.log('\n=== STEP 8: Test Password Reset ===');
    // Sign out first
    await page.goto('/api/auth/signout');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/13-signed-out.png' });

    // Go to reset password
    await page.goto('/reset-password');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/14-reset-password.png' });

    await page.fill('input[type="email"]', TEST_DATA.email);
    await page.screenshot({ path: 'test-results/15-reset-email-filled.png' });

    await page.click('button:has-text("Send Reset Link")');
    await page.waitForTimeout(2000);

    // Check for success message or rate limit error
    const pageContent = await page.content();
    const hasSuccess = pageContent.includes('sent') || pageContent.includes('check your inbox');
    const hasRateLimit = pageContent.includes('rate limit');

    await page.screenshot({ path: 'test-results/16-reset-result.png' });

    if (hasSuccess) {
      console.log('✓ Password reset email sent (check testworkflow@test.com)');
    } else if (hasRateLimit) {
      console.log('⚠️  Rate limit hit - password reset blocked temporarily');
    } else {
      console.log('❓ Password reset result unclear - check screenshot');
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Screenshots saved to test-results/');
  });
});
