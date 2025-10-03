/**
 * Authentication Tests - CompPortal MAAD System
 *
 * Tests for Studio Director and Competition Director login/registration flows
 * Mapped to:
 * - Studio Director Journey: Phase 1 (Onboarding)
 * - Competition Director Journey: Phase 1 (Login)
 */

import { test, expect } from '@playwright/test'

/**
 * Studio Director - Onboarding Tests
 */
test.describe('Studio Director - Onboarding @smoke @regression', () => {
  test('should complete registration and profile setup', async ({ page }) => {
    // Navigate to signup
    await page.goto('https://comp-portal-one.vercel.app/signup')

    // Click Studio Director option
    await page.click('text=Studio Director')

    // Fill registration form
    const testEmail = `test-studio-${Date.now()}@example.com`
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', 'SecurePass123!')
    await page.fill('input[name="studioName"]', 'Test Dance Studio')
    await page.fill('input[name="address"]', '123 Main St, Toronto, ON')
    await page.fill('input[name="phone"]', '416-555-0123')

    // Submit registration
    await page.click('button[type="submit"]')

    // Take screenshot
    await page.screenshot({ path: 'test-results/auth-registration.png' })

    // Verify email verification prompt shown
    await expect(page.locator('text=Verify your email')).toBeVisible()

    // TODO: Verify database entry via Supabase MCP
    // supabase:execute_sql(`SELECT * FROM studios WHERE name = 'Test Dance Studio'`)
  })

  test('should require approval before dashboard access', async ({ page }) => {
    // TODO: Test pending account attempting to access dashboard
    // Expect redirect to "awaiting approval" page
  })
})

/**
 * Competition Director - Login Tests
 */
test.describe('Competition Director - Login @smoke @regression', () => {
  test('should login and access admin dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('https://comp-portal-one.vercel.app/login')

    // Fill login form (use test director credentials)
    await page.fill('input[name="email"]', 'director@glowdance.com')
    await page.fill('input[name="password"]', 'DirectorPass123!')

    // Submit login
    await page.click('button[type="submit"]')

    // Wait for dashboard
    await page.waitForURL('**/dashboard')

    // Take screenshot
    await page.screenshot({ path: 'test-results/auth-director-login.png' })

    // Verify admin features visible
    await expect(page.locator('text=Admin')).toBeVisible()
  })
})

/**
 * Security Tests
 */
test.describe('Authentication Security @regression', () => {
  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/login')

    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Verify error message shown
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/signup')

    await page.fill('input[name="email"]', 'not-an-email')
    await page.click('button[type="submit"]')

    // Verify validation error
    await expect(page.locator('text=Invalid email')).toBeVisible()
  })
})
