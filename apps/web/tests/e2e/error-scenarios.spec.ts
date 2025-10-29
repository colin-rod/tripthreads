import { test, expect } from '@playwright/test'

/**
 * Error Scenario E2E Tests
 *
 * Test Cases:
 * - TC4.1: Network failure during auth shows retry option
 * - TC4.2: Provider timeout handled gracefully
 * - TC4.3: Invalid OAuth state rejected
 */

test.describe('Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('TC4.1: Network failure during auth shows retry/error', async ({ page }) => {
    await page.goto('/login')

    // Mock network failure
    await page.route('**/auth/v1/token**', async route => {
      await route.abort('failed')
    })

    // Fill and submit login form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show error message (network error or generic error)
    await expect(
      page.locator('text=/network.*error|connection.*failed|something.*wrong|failed.*sign/i')
    ).toBeVisible({ timeout: 10000 })

    // Should stay on login page
    await expect(page).toHaveURL('/login')

    // Form should be re-enabled for retry
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeEnabled()
  })

  test('TC4.2: Provider timeout handled gracefully', async ({ page }) => {
    await page.goto('/login')

    // Mock slow/timeout response
    await page.route('**/auth/v1/token**', async route => {
      // Delay response significantly
      await page.waitForTimeout(30000)
      await route.abort('timedout')
    })

    // Fill and submit login form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')

    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Button should show loading state
    await expect(submitButton).toBeDisabled()
    await expect(page.locator('text=/signing in|loading/i')).toBeVisible()

    // After timeout, should show error
    await expect(page.locator('text=/timeout|took.*long|try.*again/i')).toBeVisible({
      timeout: 35000,
    })
  })

  test('TC4.3: Invalid OAuth state rejected', async ({ page }) => {
    // Navigate to callback with invalid/missing state
    await page.goto('/auth/callback?code=invalid-code-12345&state=tampered-state')

    // Should handle error gracefully
    // Either show error or redirect to login
    await page.waitForLoadState('networkidle')

    const currentUrl = page.url()

    // Should either be on login page or show error
    const isOnLogin = currentUrl.includes('/login')
    const hasErrorMessage = await page.locator('text=/error|invalid|denied/i').isVisible()

    expect(isOnLogin || hasErrorMessage).toBe(true)

    // Should not crash or show blank page
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toBeTruthy()
    expect(bodyText!.length).toBeGreaterThan(10)
  })

  test('TC4.4: Malformed callback URL handled', async ({ page }) => {
    // Navigate to callback with no parameters
    await page.goto('/auth/callback')

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 10000 })

    // Should not crash or show error page
    await expect(page.locator('text=/Welcome back|Sign in/i')).toBeVisible()
  })

  test('TC4.5: API error responses shown to user', async ({ page }) => {
    await page.goto('/login')

    // Mock API error response
    await page.route('**/auth/v1/token**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Database connection failed',
        }),
      })
    })

    // Try to login
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show error to user
    await expect(page.locator('text=/error|failed|wrong/i')).toBeVisible({ timeout: 10000 })

    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('TC4.6: Rate limiting handled gracefully', async ({ page }) => {
    await page.goto('/login')

    // Mock rate limit response
    await page.route('**/auth/v1/token**', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
      })
    })

    // Try to login
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should show rate limit message
    await expect(page.locator('text=/rate limit|too many.*requests|try.*later/i')).toBeVisible({
      timeout: 10000,
    })

    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('TC4.7: Empty form submission prevented', async ({ page }) => {
    await page.goto('/login')

    // Try to submit without filling form
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[type="email"]')
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)

    expect(isValid).toBe(false)

    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('TC4.8: Concurrent login attempts handled', async ({ page }) => {
    await page.goto('/login')

    // Fill form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')

    // Click submit multiple times rapidly
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    await submitButton.click() // Second click
    await submitButton.click() // Third click

    // Button should be disabled after first click
    await expect(submitButton).toBeDisabled()

    // Should only make one request (not multiple)
    // This is more of a UI test - the button disables to prevent multiple submissions
    await expect(submitButton).toHaveText(/signing in|loading/i)
  })
})
