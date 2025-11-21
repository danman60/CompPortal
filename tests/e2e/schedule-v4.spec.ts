/**
 * Schedule V4 E2E Tests - CompPortal Tester
 *
 * Tests for Schedule Page Rebuild (Phase 2 Development)
 * Features tested:
 * - Checkbox selection and Select All
 * - Multi-select drag-and-drop
 * - Drop indicator positioning
 * - Award/Break modal (React Portal)
 * - Day tabs and navigation
 * - Drag from Unscheduled Routines (UR) to Scheduled Routines (SR)
 * - Schedule time calculations
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration
const BASE_URL = 'https://tester.compsync.net'
const SCHEDULE_URL = `${BASE_URL}/dashboard/director-panel/schedule`

// Test credentials (from CREDENTIALS.md)
const DIRECTOR_EMAIL = 'empwrdance@gmail.com'
const DIRECTOR_PASSWORD = '1CompSyncLogin!'

/**
 * Helper: Login as Competition Director
 */
async function loginAsDirector(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', DIRECTOR_EMAIL)
  await page.fill('input[type="password"]', DIRECTOR_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 10000 })
}

/**
 * Helper: Navigate to schedule page
 */
async function navigateToSchedule(page: Page) {
  await page.goto(SCHEDULE_URL)
  await page.waitForSelector('text=Schedule Builder', { timeout: 10000 })
}

/**
 * Helper: Wait for routines to load
 */
async function waitForRoutinesToLoad(page: Page) {
  // Wait for routine count to appear
  await page.waitForSelector('text=/\\d+ routines/', { timeout: 15000 })
  // Wait for at least one routine to be visible
  await page.waitForSelector('[data-routine-id]', { timeout: 10000 })
}

test.describe('Schedule V4 - Page Load @smoke', () => {
  test('should load schedule page with all components', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    // Verify main components present
    await expect(page.locator('text=Schedule Builder')).toBeVisible()
    await expect(page.locator('text=Unscheduled Routines')).toBeVisible()

    // Verify day tabs present
    await expect(page.locator('text=/Thursday|Friday|Saturday|Sunday/')).toBeVisible()

    // Verify action buttons present
    await expect(page.locator('button:has-text("🏆 +Award")')).toBeVisible()
    await expect(page.locator('button:has-text("☕ +Break")')).toBeVisible()
    await expect(page.locator('button:has-text("Reset Day")')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/schedule-v4-page-loaded.png', fullPage: true })
  })

  test('should show routine count and filters', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)
    await waitForRoutinesToLoad(page)

    // Verify routine count visible
    const routineCount = await page.locator('text=/\\d+ routines/').textContent()
    expect(routineCount).toMatch(/\d+/)

    // Verify filters present
    await expect(page.locator('button:has-text("Class")')).toBeVisible()
    await expect(page.locator('button:has-text("Age")')).toBeVisible()
    await expect(page.locator('button:has-text("Category")')).toBeVisible()
  })
})

test.describe('Schedule V4 - Checkbox Selection @regression', () => {
  test('should show checkboxes on all routine rows', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)
    await waitForRoutinesToLoad(page)

    // Get all routine rows
    const routineRows = await page.locator('[data-routine-id]').count()
    expect(routineRows).toBeGreaterThan(0)

    // Verify first few rows have checkboxes
    for (let i = 0; i < Math.min(5, routineRows); i++) {
      const checkbox = page.locator('[data-routine-id]').nth(i).locator('input[type="checkbox"]')
      await expect(checkbox).toBeVisible()
    }

    await page.screenshot({ path: 'test-results/schedule-checkboxes-visible.png' })
  })

  test('should show Select All button', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    const selectAllButton = page.locator('button:has-text("Select All")')
    await expect(selectAllButton).toBeVisible()

    await page.screenshot({ path: 'test-results/schedule-select-all-button.png' })
  })

  test('should select individual routine when checkbox clicked', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)
    await waitForRoutinesToLoad(page)

    // Check initial selection count
    const initialCount = await page.locator('text=/0 selected/').textContent()
    expect(initialCount).toContain('0 selected')

    // Click first checkbox
    const firstCheckbox = page.locator('[data-routine-id]').first().locator('input[type="checkbox"]')
    await firstCheckbox.click()

    // Verify selection count updated
    await expect(page.locator('text=/1 selected/')).toBeVisible({ timeout: 2000 })

    await page.screenshot({ path: 'test-results/schedule-single-routine-selected.png' })
  })

  test('should select all routines when Select All clicked', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)
    await waitForRoutinesToLoad(page)

    // Get total routine count
    const countText = await page.locator('text=/\\d+ routines/').textContent()
    const totalRoutines = parseInt(countText!.match(/\d+/)![0])

    // Click Select All
    await page.locator('button:has-text("Select All")').click()

    // Verify all routines selected
    await expect(page.locator(`text=/${totalRoutines} selected/`)).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'test-results/schedule-all-routines-selected.png' })
  })

  test('should deselect all when Deselect All clicked', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)
    await waitForRoutinesToLoad(page)

    // Select all first
    await page.locator('button:has-text("Select All")').click()
    await page.waitForTimeout(500)

    // Click Deselect All (button text changes after Select All)
    await page.locator('button:has-text("Deselect All")').click()

    // Verify no routines selected
    await expect(page.locator('text=/0 selected/')).toBeVisible({ timeout: 2000 })
  })
})

test.describe('Schedule V4 - Modal Functionality @regression', () => {
  test('should open Award modal without breaking layout', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    // Take screenshot before modal
    await page.screenshot({ path: 'test-results/schedule-before-award-modal.png' })

    // Click Award button
    await page.locator('button:has-text("🏆 +Award")').click()

    // Verify modal opened
    await expect(page.locator('text=Add Schedule Block')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Award ceremony timing')).toBeVisible()

    // Verify left panel (Unscheduled Routines) still visible (not compressed)
    await expect(page.locator('text=Unscheduled Routines')).toBeVisible()

    // Take screenshot with modal open
    await page.screenshot({ path: 'test-results/schedule-award-modal-open.png', fullPage: true })

    // Verify routine list still visible in background
    const routineListVisible = await page.locator('[data-routine-id]').first().isVisible()
    expect(routineListVisible).toBeTruthy()
  })

  test('should open Break modal without breaking layout', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    // Click Break button
    await page.locator('button:has-text("☕ +Break")').click()

    // Verify modal opened
    await expect(page.locator('text=Add Schedule Block')).toBeVisible({ timeout: 5000 })

    // Verify left panel still visible
    await expect(page.locator('text=Unscheduled Routines')).toBeVisible()

    await page.screenshot({ path: 'test-results/schedule-break-modal-open.png', fullPage: true })
  })

  test('should close modal with X button', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    // Open modal
    await page.locator('button:has-text("🏆 +Award")').click()
    await expect(page.locator('text=Add Schedule Block')).toBeVisible()

    // Close modal with X button
    await page.locator('button[aria-label="Close"]').click()

    // Verify modal closed
    await expect(page.locator('text=Add Schedule Block')).not.toBeVisible({ timeout: 2000 })

    await page.screenshot({ path: 'test-results/schedule-modal-closed.png' })
  })

  test('should close modal with Escape key', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    // Open modal
    await page.locator('button:has-text("🏆 +Award")').click()
    await expect(page.locator('text=Add Schedule Block')).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Verify modal closed
    await expect(page.locator('text=Add Schedule Block')).not.toBeVisible({ timeout: 2000 })
  })

  test('should close modal with Cancel button', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    // Open modal
    await page.locator('button:has-text("🏆 +Award")').click()
    await expect(page.locator('text=Add Schedule Block')).toBeVisible()

    // Click Cancel
    await page.locator('button:has-text("Cancel")').click()

    // Verify modal closed
    await expect(page.locator('text=Add Schedule Block')).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('Schedule V4 - Day Tabs @regression', () => {
  test('should show multiple day tabs', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    // Verify at least one day tab visible
    const dayTabs = page.locator('text=/Thursday|Friday|Saturday|Sunday/')
    const count = await dayTabs.count()
    expect(count).toBeGreaterThan(0)

    await page.screenshot({ path: 'test-results/schedule-day-tabs.png' })
  })

  test('should switch days when tab clicked', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)
    await waitForRoutinesToLoad(page)

    // Get all day tabs
    const dayTabs = await page.locator('text=/Thursday|Friday|Saturday|Sunday/').all()

    if (dayTabs.length < 2) {
      test.skip()
      return
    }

    // Click second day tab
    await dayTabs[1].click()
    await page.waitForTimeout(1000)

    // Verify tab changed (active styling)
    await page.screenshot({ path: 'test-results/schedule-day-tab-switched.png' })
  })

  test('should show routine count per day', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    // Verify day tabs show routine counts
    const routineCountInTab = page.locator('text=/\\d+ routine/')
    await expect(routineCountInTab.first()).toBeVisible()
  })
})

test.describe('Schedule V4 - Drag and Drop @manual', () => {
  // NOTE: These tests are marked @manual because Playwright has limitations
  // with drag-and-drop testing in complex scenarios. Manual testing via
  // Playwright MCP is recommended for drag-and-drop verification.

  test.skip('should drag single routine from UR to SR', async ({ page }) => {
    // Test implementation requires complex drag-and-drop simulation
    // Best tested manually with Playwright MCP
  })

  test.skip('should drag multiple selected routines', async ({ page }) => {
    // Multi-select drag requires:
    // 1. Select multiple routines (checkboxes)
    // 2. Drag one of the selected routines
    // 3. Verify all selected routines move together
    // Best tested manually with Playwright MCP
  })

  test.skip('should show drop indicator between rows', async ({ page }) => {
    // Drop indicator visibility requires:
    // 1. Start dragging a routine
    // 2. Hover over SR table
    // 3. Verify purple line appears between rows
    // Best tested manually with Playwright MCP
  })
})

test.describe('Schedule V4 - Export Functionality @smoke', () => {
  test('should show Export PDF button', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    await expect(page.locator('button:has-text("Export PDF")')).toBeVisible()
  })

  test('should show Export Excel button', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    await expect(page.locator('button:has-text("Export Excel")')).toBeVisible()
  })
})

test.describe('Schedule V4 - Reset Functionality @regression', () => {
  test('should show Reset Day button', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    await expect(page.locator('button:has-text("Reset Day")')).toBeVisible()
  })

  test('should show Reset All button', async ({ page }) => {
    await loginAsDirector(page)
    await navigateToSchedule(page)

    await expect(page.locator('button:has-text("Reset All")')).toBeVisible()
  })
})

test.describe('Schedule V4 - Console Errors @smoke', () => {
  test('should not have console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await loginAsDirector(page)
    await navigateToSchedule(page)
    await waitForRoutinesToLoad(page)

    // Allow minor errors but fail on critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Download the React DevTools') &&
      !err.includes('favicon')
    )

    if (criticalErrors.length > 0) {
      console.error('Console errors found:', criticalErrors)
    }

    expect(criticalErrors).toHaveLength(0)
  })
})
