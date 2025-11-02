/**
 * Dancer Management Tests - CompPortal MAAD System
 *
 * Tests for dancer CRUD operations and CSV import functionality
 * Mapped to: Studio Director Journey - Phase 2 (Dancer Management)
 */

import { test, expect } from '@playwright/test'

/**
 * Dancer CSV Import Tests
 */
test.describe('Dancer Management - CSV Import @regression', () => {
  test('should show checkbox selection for CSV import', async ({ page }) => {
    // Login as studio director
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    // Navigate to import page
    await page.goto('https://empwr.compsync.net/dashboard/dancers/import')

    // Download template to get CSV
    await page.click('button:has-text("Download Template")')

    // Wait for preview to load (template generates sample data)
    await page.waitForSelector('table', { timeout: 5000 })

    // Verify Select All checkbox exists in header
    await expect(page.locator('thead input[type="checkbox"]')).toBeVisible()

    // Verify individual checkboxes exist
    const checkboxes = await page.locator('tbody input[type="checkbox"]').count()
    expect(checkboxes).toBeGreaterThan(0)

    // Verify all checkboxes are auto-selected
    const checkedCount = await page.locator('tbody input[type="checkbox"]:checked').count()
    expect(checkedCount).toBe(checkboxes)

    // Verify import button shows count
    await expect(page.locator('button:has-text("Import (")')).toBeVisible()
  })

  test('should only validate selected dancers', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    await page.goto('https://empwr.compsync.net/dashboard/dancers/import')
    await page.click('button:has-text("Download Template")')
    await page.waitForSelector('table')

    // Uncheck first dancer
    await page.locator('tbody tr:first-child input[type="checkbox"]').uncheck()

    // Clear classification for first dancer (unchecked)
    await page.locator('tbody tr:first-child select').first().selectOption('')

    // Import button should still work (unchecked dancers not validated)
    const importButton = page.locator('button:has-text("Import (")')
    await expect(importButton).toBeEnabled()

    // Now uncheck all and check only first dancer (missing classification)
    await page.locator('thead input[type="checkbox"]').uncheck()
    await page.locator('tbody tr:first-child input[type="checkbox"]').check()

    // Now import should fail validation (checked dancer missing classification)
    await importButton.click()
    await expect(page.locator('text=/missing classification/i')).toBeVisible()
  })

  test('should update import count when checkboxes change', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    await page.goto('https://empwr.compsync.net/dashboard/dancers/import')
    await page.click('button:has-text("Download Template")')
    await page.waitForSelector('table')

    // Get initial count
    const totalDancers = await page.locator('tbody tr').count()
    await expect(page.locator(`button:has-text("Import (${totalDancers} selected)")`)).toBeVisible()

    // Uncheck one dancer
    await page.locator('tbody tr:first-child input[type="checkbox"]').uncheck()
    await expect(page.locator(`button:has-text("Import (${totalDancers - 1} selected)")`)).toBeVisible()

    // Uncheck all
    await page.locator('thead input[type="checkbox"]').uncheck()
    await expect(page.locator('button:has-text("Import (0 selected)")')).toBeVisible()

    // Import button disabled when none selected
    await expect(page.locator('button:has-text("Import (0 selected)")')).toBeDisabled()
  })

  test('should only import selected dancers', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    await page.goto('https://empwr.compsync.net/dashboard/dancers/import')
    await page.click('button:has-text("Download Template")')
    await page.waitForSelector('table')

    // Uncheck all
    await page.locator('thead input[type="checkbox"]').uncheck()

    // Check only first dancer
    await page.locator('tbody tr:first-child input[type="checkbox"]').check()

    // Get first dancer's name
    const firstName = await page.locator('tbody tr:first-child input[placeholder*="First"]').inputValue()

    // Import
    await page.click('button:has-text("Import (1 selected)")')

    // Verify success message mentions only 1 dancer
    await expect(page.locator('text=/Successfully created 1 dancer/i')).toBeVisible({ timeout: 10000 })
  })

  test('should show warning only for selected dancers with missing fields', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    await page.goto('https://empwr.compsync.net/dashboard/dancers/import')
    await page.click('button:has-text("Download Template")')
    await page.waitForSelector('table')

    // Clear classification for first dancer
    await page.locator('tbody tr:first-child select').first().selectOption('')

    // Warning should show "1 selected dancer(s) need classification"
    await expect(page.locator('text=/selected dancer.*missing/i')).toBeVisible()

    // Uncheck first dancer
    await page.locator('tbody tr:first-child input[type="checkbox"]').uncheck()

    // Warning should disappear (unchecked dancers not counted)
    await expect(page.locator('text=/selected dancer.*missing/i')).not.toBeVisible()
  })

  test('should calculate ages correctly from birthdate', async ({ page }) => {
    // TODO: Test age calculation logic
    // Emma (born 2010-03-15) should be 15 years old in 2025
    // Sophia (born 2012-07-22) should be 13 years old in 2025
    // Olivia (born 2008-11-05) should be 17 years old in 2025
  })

  test('should detect duplicate dancers', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/dashboard/dancers')

    // TODO: Test importing same CSV twice
    // Verify warning message shown
    // Allow user to skip or overwrite
  })
})

/**
 * Dancer Batch Add Tests
 */
test.describe('Dancer Management - Batch Add @regression', () => {
  test('should show toast validation for batch form', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    // Navigate to batch add page
    await page.goto('https://empwr.compsync.net/dashboard/dancers/batch-add')

    // Try to submit with empty first row
    await page.click('button:has-text("Save All Dancers")')

    // Verify toast error shows
    await expect(page.locator('text=/Please enter at least one dancer/i')).toBeVisible()
  })

  test('should show specific validation errors in toast', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    await page.goto('https://empwr.compsync.net/dashboard/dancers/batch-add')

    // Fill only name, missing DOB and classification
    await page.fill('input[placeholder*="First"]', 'Test')
    await page.fill('input[placeholder*="Last"]', 'Dancer')

    // Submit
    await page.click('button:has-text("Save All Dancers")')

    // Verify specific error toast
    await expect(page.locator('text=/missing date of birth/i')).toBeVisible()
  })

  test('should validate classification requirement in batch form', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    await page.goto('https://empwr.compsync.net/dashboard/dancers/batch-add')

    // Fill name and DOB, but no classification
    await page.fill('input[placeholder*="First"]', 'Test')
    await page.fill('input[placeholder*="Last"]', 'Dancer')
    await page.fill('input[type="date"]', '2010-01-01')

    // Submit
    await page.click('button:has-text("Save All Dancers")')

    // Verify classification error toast
    await expect(page.locator('text=/missing classification/i')).toBeVisible()
  })

  test('should skip empty rows in batch form', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/login')
    await page.fill('input[type="email"]', 'daniel@streamstage.live')
    await page.fill('input[type="password"]', '123456')
    await page.click('button:has-text("Sign In")')

    await page.goto('https://empwr.compsync.net/dashboard/dancers/batch-add')

    // Add 5 rows
    await page.click('button:has-text("Add 5 Rows")')

    // Fill only first row completely
    await page.locator('tbody tr:first-child input[placeholder*="First"]').fill('Test')
    await page.locator('tbody tr:first-child input[placeholder*="Last"]').fill('Dancer')
    await page.locator('tbody tr:first-child input[type="date"]').fill('2010-01-01')
    await page.locator('tbody tr:first-child select').first().selectOption({ index: 1 })

    // Submit - should only create 1 dancer, skip empty rows
    await page.click('button:has-text("Save All Dancers")')

    // Verify success for 1 dancer
    await expect(page.locator('text=/Successfully created 1 dancer/i')).toBeVisible({ timeout: 10000 })
  })
})

/**
 * Dancer CRUD Tests
 */
test.describe('Dancer Management - CRUD Operations @regression', () => {
  test('should create new dancer manually', async ({ page }) => {
    await page.goto('https://empwr.compsync.net/dashboard/dancers')

    // Click new dancer button
    await page.click('button:has-text("New Dancer")')

    // Fill form
    await page.fill('input[name="firstName"]', 'Test')
    await page.fill('input[name="lastName"]', 'Dancer')
    await page.fill('input[name="birthdate"]', '2010-01-01')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success message
    await expect(page.locator('text=Dancer created')).toBeVisible()
  })

  test('should edit dancer details', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/dashboard/dancers')

    // Click edit on first dancer
    await page.click('tr:first-child button:has-text("Edit")')

    // Update name
    await page.fill('input[name="firstName"]', 'Updated')

    // Save
    await page.click('button:has-text("Save")')

    // Verify update
    await expect(page.locator('text=Dancer updated')).toBeVisible()
  })

  test('should search and filter dancers', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/dashboard/dancers')

    // Search by name
    await page.fill('input[placeholder*="Search"]', 'Emma')

    // Verify filtered results
    // TODO: Verify only matching dancers shown
  })

  test('should archive dancer', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/dashboard/dancers')

    // Click archive on first dancer
    await page.click('tr:first-child button:has-text("Archive")')

    // Confirm archive
    await page.click('button:has-text("Confirm")')

    // Verify success
    await expect(page.locator('text=Dancer archived')).toBeVisible()
  })
})

/**
 * Validation Tests
 */
test.describe('Dancer Management - Validation @regression', () => {
  test('should reject invalid birthdate', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/dashboard/dancers')

    await page.click('button:has-text("New Dancer")')

    // Try future date
    await page.fill('input[name="birthdate"]', '2030-01-01')
    await page.click('button[type="submit"]')

    // Verify validation error
    await expect(page.locator('text=Invalid birthdate')).toBeVisible()
  })

  test('should reject unrealistic age', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/dashboard/dancers')

    await page.click('button:has-text("New Dancer")')

    // Try date making dancer 100+ years old
    await page.fill('input[name="birthdate"]', '1900-01-01')
    await page.click('button[type="submit"]')

    // Verify validation error
    await expect(page.locator('text=Unrealistic age')).toBeVisible()
  })
})
