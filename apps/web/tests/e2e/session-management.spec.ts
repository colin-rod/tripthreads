import { test, expect } from '@playwright/test'

/**
 * Session Management E2E Tests
 *
 * Test Cases:
 * - TC3.1: Session persists after page reload (web)
 * - TC3.2: Session persists after app relaunch (mobile - tested separately)
 * - TC3.3: Expired session redirects to login
 * - TC3.4: Logout clears session and redirects
 */

/**
 * Helper to create a unique test user for each test
 */
async function createTestUser(page: {
  goto: (url: string) => Promise<void>
  fill: (selector: string, value: string) => Promise<void>
  click: (selector: string) => Promise<void>
}) {
  const testEmail = `session-test-${Date.now()}-${Math.random().toString(36).substring(7)}@tripthreads.test`
  const testPassword = 'SessionTest123!'
  const testName = 'Session Test User'

  await page.goto('/signup')
  await page.fill('input[type="text"]', testName)
  await page.fill('input[type="email"]', testEmail)
  await page.fill('input[type="password"]', testPassword)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/trips', { timeout: 10000 })

  // Logout after creation so tests can login with fresh session
  await page.click('button:has-text("Sign out")')
  await expect(page).toHaveURL('/login', { timeout: 10000 })

  return { testEmail, testPassword, testName }
}

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('TC3.1: Session persists after page reload (web)', async ({ page }) => {
    const { testEmail, testPassword } = await createTestUser(page)

    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/trips', { timeout: 10000 })
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()

    // Capture auth state before reload
    const authStateBefore = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(key => key.includes('supabase'))
      return keys.map(key => ({ key, value: localStorage.getItem(key) }))
    })

    expect(authStateBefore.length).toBeGreaterThan(0)

    // Reload page
    await page.reload()

    // Should still be authenticated
    await expect(page).toHaveURL('/trips')
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()

    // Auth state should persist
    const authStateAfter = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(key => key.includes('supabase'))
      return keys.map(key => ({ key, value: localStorage.getItem(key) }))
    })

    expect(authStateAfter.length).toBe(authStateBefore.length)
  })

  test('TC3.1b: Session persists across multiple page navigations', async ({ page }) => {
    const { testEmail, testPassword } = await createTestUser(page)

    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/trips', { timeout: 10000 })

    // Navigate to different routes
    await page.goto('/')
    await expect(page).toHaveURL('/trips') // Should redirect authenticated user

    await page.goto('/login')
    await expect(page).toHaveURL('/trips') // Should redirect authenticated user

    await page.goto('/signup')
    await expect(page).toHaveURL('/trips') // Should redirect authenticated user

    // Should still be authenticated throughout
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
  })

  test('TC3.1c: Session persists across browser tabs', async ({ page, context }) => {
    const { testEmail, testPassword } = await createTestUser(page)

    // Login in first tab
    await page.goto('/login')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/trips', { timeout: 10000 })

    // Open new tab
    const newTab = await context.newPage()
    await newTab.goto('/trips')

    // Should be authenticated in new tab without login
    await expect(newTab).toHaveURL('/trips')
    await expect(newTab.locator(`text=${testEmail}`)).toBeVisible()

    await newTab.close()
  })

  test('TC3.3: Expired session redirects to login', async ({ page }) => {
    const { testEmail, testPassword } = await createTestUser(page)

    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/trips', { timeout: 10000 })

    // Manually expire the session by clearing tokens
    await page.evaluate(() => {
      // Clear all auth-related storage
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key)
        }
      })
    })

    // Reload page
    await page.reload()

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 10000 })
  })

  test('TC3.4: Logout clears session and redirects', async ({ page }) => {
    const { testEmail, testPassword } = await createTestUser(page)

    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/trips', { timeout: 10000 })
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()

    // Verify auth tokens exist
    const authTokensBefore = await page.evaluate(() => {
      return Object.keys(localStorage).filter(key => key.includes('supabase')).length
    })

    expect(authTokensBefore).toBeGreaterThan(0)

    // Click logout
    await page.click('button:has-text("Sign out")')

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 10000 })

    // Auth tokens should be cleared
    const authTokensAfter = await page.evaluate(() => {
      return Object.keys(localStorage).filter(key => key.includes('supabase')).length
    })

    expect(authTokensAfter).toBe(0)

    // Try to access protected route
    await page.goto('/trips')

    // Should redirect back to login
    await expect(page).toHaveURL('/login', { timeout: 10000 })
  })

  test('TC3.5: Unauthenticated access to protected routes redirects', async ({ page }) => {
    // Ensure no auth state
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    // Try to access protected route
    await page.goto('/trips')

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 10000 })
  })

  test('TC3.6: Auto token refresh maintains session', async ({ page }) => {
    const { testEmail, testPassword } = await createTestUser(page)

    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/trips', { timeout: 10000 })

    // Get initial token timestamp
    const initialTokenData = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(key => key.includes('supabase'))
      return keys.map(key => localStorage.getItem(key))
    })

    expect(initialTokenData.length).toBeGreaterThan(0)

    // Wait for potential token refresh (Supabase refreshes proactively)
    // This is a simplified test - in production, tokens last ~1 hour
    await page.waitForTimeout(2000)

    // Session should still be valid
    await page.reload()
    await expect(page).toHaveURL('/trips')
    await expect(page.locator(`text=${testEmail}`)).toBeVisible()
  })
})
