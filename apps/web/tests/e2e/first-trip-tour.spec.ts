/**
 * First Trip Creation Tour E2E Tests
 *
 * IMPORTANT: These tests should NOT be run locally.
 * They run automatically in CI/CD (GitHub Actions).
 *
 * Tests the complete first trip creation guided walkthrough:
 * 1. Tour triggers for new users with no trips
 * 2. User can navigate through tour steps
 * 3. User can skip or dismiss tour
 * 4. Tour progress is tracked
 * 5. Tour completes after final step
 */

import { test, expect } from '@playwright/test'

test.describe('First Trip Creation Tour', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate first-time user
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())

    // TODO: Set up authenticated user with no trips
    // This will require proper auth setup in E2E environment
  })

  test('shows tour for new user with no trips', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour to appear
    await expect(page.locator('[data-testid="tour-spotlight"]')).toBeVisible({ timeout: 5000 })

    // Check first step content
    await expect(page.getByRole('dialog')).toContainText("Let's create your first trip!")
  })

  test('allows user to navigate through tour steps', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour
    await page.locator('[role="dialog"]').waitFor()

    // Step 1: Welcome
    await expect(page.getByRole('dialog')).toContainText("Let's create your first trip!")
    await page.getByRole('button', { name: 'Next' }).click()

    // Note: Subsequent steps require clicking the create trip button
    // and navigating through the dialog, which may be complex in E2E
  })

  test('allows user to skip tour', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour
    await page.locator('[role="dialog"]').waitFor()

    // Click skip button
    await page.getByRole('button', { name: 'Skip tour' }).click()

    // Tour should disappear
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()

    // Check localStorage
    const tourProgress = await page.evaluate(() => {
      const stored = localStorage.getItem('tripthreads_tour_progress')
      return stored ? JSON.parse(stored) : null
    })

    expect(tourProgress?.['first-trip-creation']?.dismissed).toBe(true)
  })

  test('allows user to dismiss and resume tour', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour
    await page.locator('[role="dialog"]').waitFor()

    // Advance to step 2
    await page.getByRole('button', { name: 'Next' }).click()

    // Dismiss tour by clicking X
    await page.getByLabel('Close tour').click()

    // Tour should disappear
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()

    // Reload page
    await page.reload()

    // Tour should resume from where user left off
    // (This requires tour resume logic to be implemented)
    await expect(page.locator('[role="dialog"]')).toBeVisible()
  })

  test('does not show tour for users with existing trips', async ({ page }) => {
    // TODO: Set up authenticated user with trips
    // This requires proper test data setup

    await page.goto('/trips')

    // Wait a bit to ensure tour doesn't appear
    await page.waitForTimeout(2000)

    // Tour should not appear
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('tracks tour progress in localStorage', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour
    await page.locator('[role="dialog"]').waitFor()

    // Check initial progress
    let tourProgress = await page.evaluate(() => {
      const stored = localStorage.getItem('tripthreads_tour_progress')
      return stored ? JSON.parse(stored) : null
    })

    expect(tourProgress?.['first-trip-creation']).toBeDefined()
    expect(tourProgress?.['first-trip-creation']?.currentStep).toBe(0)

    // Advance step
    await page.getByRole('button', { name: 'Next' }).click()

    // Check updated progress
    tourProgress = await page.evaluate(() => {
      const stored = localStorage.getItem('tripthreads_tour_progress')
      return stored ? JSON.parse(stored) : null
    })

    expect(tourProgress?.['first-trip-creation']?.currentStep).toBeGreaterThan(0)
  })

  test('shows progress indicator with correct step count', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour
    await page.locator('[role="dialog"]').waitFor()

    // Check for 6 progress bars (6 steps in tour)
    const progressBars = page.locator('[class*="rounded-full"]')
    await expect(progressBars).toHaveCount(6)
  })

  test('back button navigates to previous step', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour
    await page.locator('[role="dialog"]').waitFor()

    // Step 1
    await expect(page.getByRole('dialog')).toContainText("Let's create your first trip!")

    // No back button on first step
    await expect(page.getByRole('button', { name: 'Back' })).not.toBeVisible()

    // Go to step 2
    await page.getByRole('button', { name: 'Next' }).click()

    // Back button should appear
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()

    // Click back
    await page.getByRole('button', { name: 'Back' }).click()

    // Should be back on step 1
    await expect(page.getByRole('dialog')).toContainText("Let's create your first trip!")
  })

  test('highlights target element with spotlight', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour
    await page.locator('[role="dialog"]').waitFor()

    // Check for spotlight SVG
    const spotlight = page.locator('svg')
    await expect(spotlight).toBeVisible()

    // Check for highlighted ring around target
    const highlightRing = page.locator('rect[stroke="hsl(var(--primary))"]')
    await expect(highlightRing).toBeVisible()
  })

  test('completes tour when user finishes all steps', async ({ page }) => {
    await page.goto('/trips')

    // Wait for tour
    await page.locator('[role="dialog"]').waitFor()

    // Navigate through all steps (this is simplified)
    // In reality, some steps require user actions

    // Click through to final step
    for (let i = 0; i < 5; i++) {
      const nextButton = page.getByRole('button', { name: /Next|Finish/ })
      if (await nextButton.isVisible()) {
        await nextButton.click()
      }
    }

    // Tour should be completed in localStorage
    const tourProgress = await page.evaluate(() => {
      const stored = localStorage.getItem('tripthreads_tour_progress')
      return stored ? JSON.parse(stored) : null
    })

    expect(tourProgress?.['first-trip-creation']?.completed).toBe(true)
  })
})
