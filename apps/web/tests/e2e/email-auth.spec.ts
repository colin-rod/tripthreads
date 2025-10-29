import { test, expect } from '@playwright/test'

/**
 * Email Authentication E2E Tests
 *
 * Test Cases:
 * - TC1.1: Valid email signup creates user record
 * - TC1.2: Duplicate email shows appropriate error
 * - TC1.3: Invalid email format rejected
 * - TC1.4: Login with correct credentials succeeds
 * - TC1.5: Login with incorrect password fails
 * - TC1.6: Session token stored and persisted
 */

test.describe('Email Authentication', () => {
  // Generate unique email for each test run
  const timestamp = Date.now()
  const testEmail = `test-${timestamp}@tripthreads.test`
  const testPassword = 'TestPassword123!'
  const testName = 'Test User'

  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('TC1.1: Valid email signup creates user record', async ({ page }) => {
    await page.goto('/signup')

    // Fill signup form
    await page.fill('input[type="text"]', testName)
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for success message
    await expect(page.locator('text=Account created!')).toBeVisible({ timeout: 10000 })

    // Should redirect to trips page
    await expect(page).toHaveURL('/trips', { timeout: 5000 })

    // Should see user email in nav
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
  })

  test('TC1.2: Duplicate email shows appropriate error', async ({ page }) => {
    await page.goto('/signup')

    // Try to signup with same email again
    await page.fill('input[type="text"]', testName)
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    // Should show error (email already exists or similar)
    await expect(
      page.locator('text=/already.*registered|already.*exists|already.*taken/i')
    ).toBeVisible({ timeout: 10000 })

    // Should NOT redirect
    await expect(page).toHaveURL('/signup')
  })

  test('TC1.3: Invalid email format rejected', async ({ page }) => {
    await page.goto('/signup')

    // Try invalid email formats
    const invalidEmails = ['notanemail', 'missing@domain', '@nodomain.com', 'spaces in@email.com']

    for (const invalidEmail of invalidEmails) {
      await page.fill('input[type="text"]', testName)
      await page.fill('input[type="email"]', invalidEmail)
      await page.fill('input[type="password"]', testPassword)

      // HTML5 validation should prevent submission
      const emailInput = page.locator('input[type="email"]')
      const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)
      expect(isValid).toBe(false)
    }
  })

  test('TC1.4: Login with correct credentials succeeds', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)

    // Submit
    await page.click('button[type="submit"]')

    // Should redirect to trips
    await expect(page).toHaveURL('/trips', { timeout: 10000 })

    // Should see user email
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
  })

  test('TC1.5: Login with incorrect password fails', async ({ page }) => {
    await page.goto('/login')

    // Fill with wrong password
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', 'WrongPassword123!')
    await page.click('button[type="submit"]')

    // Should show error
    await expect(
      page.locator('text=/invalid.*credentials|incorrect.*password|wrong.*password/i')
    ).toBeVisible({ timeout: 10000 })

    // Should NOT redirect
    await expect(page).toHaveURL('/login')
  })

  test('TC1.6: Session token stored and persisted', async ({ page, context }) => {
    await page.goto('/login')

    // Login
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    // Wait for redirect
    await expect(page).toHaveURL('/trips', { timeout: 10000 })

    // Check localStorage has auth tokens
    const localStorage = await page.evaluate(() => {
      const keys = Object.keys(window.localStorage)
      return keys.filter(key => key.includes('supabase') || key.includes('auth'))
    })

    expect(localStorage.length).toBeGreaterThan(0)

    // Reload page - session should persist
    await page.reload()

    // Should still be on trips page (not redirected to login)
    await expect(page).toHaveURL('/trips')
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()

    // Open new tab - session should persist across tabs
    const newPage = await context.newPage()
    await newPage.goto('/trips')

    // Should be authenticated without login
    await expect(newPage).toHaveURL('/trips')
    await expect(newPage.locator(`text=${testEmail}`)).toBeVisible()
  })

  test('TC1.7: Password must be at least 6 characters', async ({ page }) => {
    await page.goto('/signup')

    await page.fill('input[type="text"]', testName)
    await page.fill('input[type="email"]', `short-pw-${timestamp}@test.com`)
    await page.fill('input[type="password"]', '12345') // Only 5 characters
    await page.click('button[type="submit"]')

    // Should show password length error
    await expect(page.locator('text=/password.*at least.*6.*characters/i')).toBeVisible()

    // Should NOT redirect
    await expect(page).toHaveURL('/signup')
  })
})
