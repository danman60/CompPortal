/**
 * Scheduling Tests - CompPortal MAAD System
 *
 * Tests for schedule generation, conflict detection, and export features
 * Mapped to:
 * - Studio Director Journey: Phase 5 (Schedule & Music)
 * - Competition Director Journey: Phase 4 (Scheduling)
 */

import { test, expect } from '@playwright/test'

/**
 * Studio Director - Schedule Export Tests (PRIORITY)
 */
test.describe('Studio Director - Schedule Export @smoke @regression', () => {
  test('should export schedule as PDF', async ({ page }) => {
    // Login as studio director
    await page.goto('https://comp-portal-one.vercel.app/login')
    // TODO: Complete login flow

    // Navigate to scheduling page
    await page.goto('https://comp-portal-one.vercel.app/dashboard/scheduling')

    // Click export PDF button
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export PDF")')
    const download = await downloadPromise

    // Take screenshot
    await page.screenshot({ path: 'test-results/schedule-export-pdf.png' })

    // Verify download occurred
    expect(download.suggestedFilename()).toContain('schedule')
    expect(download.suggestedFilename()).toContain('.pdf')
  })

  test('should export schedule as CSV', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/dashboard/scheduling')

    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export CSV")')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('schedule')
    expect(download.suggestedFilename()).toContain('.csv')
  })

  test('should export schedule as iCal', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/dashboard/scheduling')

    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export iCal")')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('schedule')
    expect(download.suggestedFilename()).toMatch(/\.(ics|ical)$/)
  })
})

/**
 * Competition Director - Schedule Generation Tests
 */
test.describe('Competition Director - Scheduling @regression', () => {
  test('should auto-generate competition schedule', async ({ page }) => {
    // Login as director
    await page.goto('https://comp-portal-one.vercel.app/login')
    // TODO: Complete director login

    // Navigate to admin scheduling
    await page.goto('https://comp-portal-one.vercel.app/admin/scheduling')

    // Click auto-generate button
    await page.click('button:has-text("Auto-Generate Schedule")')

    // Wait for completion
    await page.waitForSelector('text=Schedule Generated Successfully', {
      timeout: 60000 // Allow up to 1 minute for generation
    })

    // Take screenshot
    await page.screenshot({ path: 'test-results/schedule-generated.png' })

    // Check if conflicts detected
    const conflictsVisible = await page.isVisible('div.conflicts-detected')
    if (conflictsVisible) {
      await page.screenshot({ path: 'test-results/schedule-conflicts.png' })
      console.warn('⚠️ Conflicts detected in generated schedule')
    }

    // Verify entries are scheduled
    // TODO: Query database to verify session assignments
  })

  test('should detect scheduling conflicts', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/admin/scheduling')

    // Navigate to conflicts panel
    await page.click('button:has-text("Show Conflicts")')

    // Take screenshot of conflicts
    await page.screenshot({ path: 'test-results/schedule-conflicts-panel.png' })

    // Verify conflict types are labeled
    const hasErrors = await page.isVisible('.conflict-error')
    const hasWarnings = await page.isVisible('.conflict-warning')

    console.log(`Conflicts found: ${hasErrors ? 'Errors' : 'None'}, ${hasWarnings ? 'Warnings' : 'None'}`)
  })

  test('should allow manual schedule adjustments', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/admin/scheduling')

    // TODO: Implement manual entry assignment test
    // Click entry, select new session, verify update
  })
})

/**
 * Performance Tests
 */
test.describe('Scheduling Performance @full', () => {
  test('should generate schedule in reasonable time', async ({ page }) => {
    await page.goto('https://comp-portal-one.vercel.app/admin/scheduling')

    const startTime = Date.now()
    await page.click('button:has-text("Auto-Generate Schedule")')
    await page.waitForSelector('text=Schedule Generated Successfully', {
      timeout: 60000
    })
    const endTime = Date.now()

    const duration = endTime - startTime
    console.log(`Schedule generation took: ${duration}ms`)

    // Assert reasonable time (under 30 seconds)
    expect(duration).toBeLessThan(30000)
  })
})
