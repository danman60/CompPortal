/**
 * Dancer Management Tests - CompPortal MAAD System
 *
 * Tests for dancer CRUD operations and CSV import functionality
 * Mapped to: Studio Director Journey - Phase 2 (Dancer Management)
 *
 * ⚠️ PRODUCTION WARNING:
 * - These tests run against PRODUCTION (empwr.compsync.net)
 * - UI verification tests are safe (read-only)
 * - Data mutation tests are marked with @data-mutation tag
 * - Do NOT run @data-mutation tests in CI without proper cleanup
 */

import { test, expect } from '@playwright/test'

/**
 * Test configuration
 */
const TEST_CONFIG = {
  baseUrl: 'https://empwr.compsync.net',
  credentials: {
    email: 'daniel@streamstage.live',
    password: '123456'
  },
  timeout: 10000
}

/**
 * Helper: Login to application
 * Verifies login succeeded by waiting for dashboard redirect
 */
async function loginAsStudioDirector(page: any) {
  await page.goto(`${TEST_CONFIG.baseUrl}/login`)
  await page.fill('input[type="email"]', TEST_CONFIG.credentials.email)
  await page.fill('input[type="password"]', TEST_CONFIG.credentials.password)
  await page.click('button:has-text("Sign In")')

  // Wait for redirect to dashboard (verify login succeeded)
  await page.waitForURL(/.*\/dashboard.*/, { timeout: 5000 })
}

/**
 * Dancer CSV Import Tests - UI Verification (Read-Only)
 * These tests verify checkbox selection UI exists and behaves correctly
 * NO data is imported to production database
 */
test.describe('Dancer CSV Import - Checkbox Selection UI @safe @regression', () => {
  test('should display checkbox selection UI with auto-select', async ({ page }) => {
    await loginAsStudioDirector(page)
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/dancers/import`)

    // Download template triggers preview with sample data
    await page.click('button:has-text("Download Template")')
    await page.waitForSelector('table tbody tr', { timeout: 5000 })

    // Verify Select All checkbox in header
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]')
    await expect(selectAllCheckbox).toBeVisible()
    await expect(selectAllCheckbox).toBeChecked() // Auto-selected on load

    // Verify individual row checkboxes
    const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
    const checkboxCount = await rowCheckboxes.count()
    expect(checkboxCount).toBeGreaterThan(0)

    // Verify all rows auto-checked
    for (let i = 0; i < checkboxCount; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked()
    }

    // Verify import button shows count format
    await expect(page.locator('button', { hasText: /Import \(\d+ selected\)/ })).toBeVisible()
  })

  test('should update import button count dynamically', async ({ page }) => {
    await loginAsStudioDirector(page)
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/dancers/import`)

    await page.click('button:has-text("Download Template")')
    await page.waitForSelector('table tbody tr')

    // Get initial dancer count
    const totalDancers = await page.locator('tbody tr').count()

    // Verify initial count
    await expect(page.locator('button', {
      hasText: new RegExp(`Import \\(${totalDancers} selected\\)`)
    })).toBeVisible()

    // Uncheck one dancer
    await page.locator('tbody tr:first-child input[type="checkbox"]').uncheck()
    await expect(page.locator('button', {
      hasText: new RegExp(`Import \\(${totalDancers - 1} selected\\)`)
    })).toBeVisible()

    // Uncheck all via Select All checkbox
    await page.locator('thead input[type="checkbox"]').uncheck()
    const noneSelectedButton = page.locator('button', { hasText: /Import \(0 selected\)/ })
    await expect(noneSelectedButton).toBeVisible()
    await expect(noneSelectedButton).toBeDisabled() // Should disable when none selected
  })

  test('should show warning banner only for selected dancers', async ({ page }) => {
    await loginAsStudioDirector(page)
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/dancers/import`)

    await page.click('button:has-text("Download Template")')
    await page.waitForSelector('table tbody tr')

    // Clear classification for first dancer (creates validation error)
    await page.locator('tbody tr:first-child select').first().selectOption({ value: '' })

    // Warning should appear with "selected dancer" text
    const warningBanner = page.locator('text=/selected dancer.*missing/i')
    await expect(warningBanner).toBeVisible()

    // Uncheck the dancer with missing classification
    await page.locator('tbody tr:first-child input[type="checkbox"]').uncheck()

    // Warning should disappear (unchecked dancers excluded from validation)
    await expect(warningBanner).not.toBeVisible()
  })

  test('should toggle Select All checkbox correctly', async ({ page }) => {
    await loginAsStudioDirector(page)
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/dancers/import`)

    await page.click('button:has-text("Download Template")')
    await page.waitForSelector('table tbody tr')

    const selectAllCheckbox = page.locator('thead input[type="checkbox"]')
    const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
    const rowCount = await rowCheckboxes.count()

    // Initially all should be checked
    await expect(selectAllCheckbox).toBeChecked()

    // Uncheck Select All
    await selectAllCheckbox.uncheck()

    // All rows should be unchecked
    for (let i = 0; i < rowCount; i++) {
      await expect(rowCheckboxes.nth(i)).not.toBeChecked()
    }

    // Re-check Select All
    await selectAllCheckbox.check()

    // All rows should be checked again
    for (let i = 0; i < rowCount; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked()
    }
  })
})

/**
 * Dancer Batch Add Form - Toast Validation Tests (Read-Only)
 * Verifies toast notification validation without importing data
 */
test.describe('Dancer Batch Add - Toast Validation @safe @regression', () => {
  test('should show toast error for empty form submission', async ({ page }) => {
    await loginAsStudioDirector(page)
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/dancers/batch-add`)

    // Try to submit empty form (first row has no data)
    await page.click('button:has-text("Save All Dancers")')

    // Verify toast error appears
    await expect(page.locator('text=/Please enter at least one dancer/i')).toBeVisible()
  })

  test('should show toast for missing date of birth', async ({ page }) => {
    await loginAsStudioDirector(page)
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/dancers/batch-add`)

    // Fill only name fields
    await page.locator('tbody tr:first-child input[placeholder*="First"]').fill('TestFirst')
    await page.locator('tbody tr:first-child input[placeholder*="Last"]').fill('TestLast')

    // Submit without DOB or classification
    await page.click('button:has-text("Save All Dancers")')

    // Should show validation error toast
    await expect(page.locator('text=/missing date of birth/i')).toBeVisible()
  })

  test('should show toast for missing classification', async ({ page }) => {
    await loginAsStudioDirector(page)
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard/dancers/batch-add`)

    // Fill name and DOB but not classification
    await page.locator('tbody tr:first-child input[placeholder*="First"]').fill('TestFirst')
    await page.locator('tbody tr:first-child input[placeholder*="Last"]').fill('TestLast')
    await page.locator('tbody tr:first-child input[type="date"]').fill('2010-01-01')

    // Submit
    await page.click('button:has-text("Save All Dancers")')

    // Should show classification error
    await expect(page.locator('text=/missing classification/i')).toBeVisible()
  })
})

/**
 * Dancer CRUD Tests (Placeholder - TODO)
 * These require proper test data setup/cleanup before implementation
 */
test.describe('Dancer CRUD Operations @todo', () => {
  test.skip('should create new dancer manually', async ({ page }) => {
    // TODO: Implement with proper test data cleanup
    // Requires:
    // 1. Create test dancer
    // 2. Verify creation
    // 3. Delete test dancer (cleanup)
  })

  test.skip('should edit dancer details', async ({ page }) => {
    // TODO: Implement with test fixtures
  })

  test.skip('should archive dancer', async ({ page }) => {
    // TODO: Implement with soft delete verification
  })
})

/**
 * Age Calculation Tests (Placeholder - TODO)
 */
test.describe('Age Calculation @todo', () => {
  test.skip('should calculate ages correctly from birthdate', async ({ page }) => {
    // TODO: Test age calculation logic
    // Emma (born 2010-03-15) should be 15 years old in 2025
    // Sophia (born 2012-07-22) should be 13 years old in 2025
    // Olivia (born 2008-11-05) should be 17 years old in 2025
  })
})
