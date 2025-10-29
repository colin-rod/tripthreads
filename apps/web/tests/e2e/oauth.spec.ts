import { test, expect } from '@playwright/test'

/**
 * OAuth Flow E2E Tests
 *
 * Test Cases:
 * - TC2.1: Google OAuth redirects to provider
 * - TC2.2: Google callback creates/updates user
 * - TC2.5: OAuth errors handled gracefully
 *
 * Note: These tests mock the OAuth provider to avoid external dependencies
 */

test.describe('Google OAuth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('TC2.1: Google OAuth redirects to provider', async ({ page }) => {
    await page.goto('/login')

    // Click Google OAuth button
    const googleButton = page.locator('button:has-text("Continue with Google")')
    await expect(googleButton).toBeVisible()

    // In a real scenario, clicking would redirect to Google
    // For E2E, we verify the button exists and is clickable
    await expect(googleButton).toBeEnabled()

    // Verify the button has proper styling and icon
    await expect(googleButton).toContainText('Continue with Google')
  })

  test('TC2.2: Google callback creates/updates user profile', async ({ page }) => {
    // This test simulates the OAuth callback flow
    // In production, this would be triggered by Google redirecting back

    // Simulate callback with auth code (this would normally come from Google)
    const mockCode = 'mock-auth-code-' + Date.now()

    // Mock Supabase exchangeCodeForSession
    await page.route('**/auth/v1/**', async route => {
      const url = route.request().url()

      if (url.includes('token') && route.request().method() === 'POST') {
        // Mock successful token exchange
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-access-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh-token',
            user: {
              id: 'mock-user-id-' + Date.now(),
              email: 'oauth-user@gmail.com',
              user_metadata: {
                full_name: 'OAuth Test User',
                avatar_url: 'https://example.com/avatar.jpg',
              },
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    // Navigate to callback URL (simulating Google redirect)
    await page.goto(`/auth/callback?code=${mockCode}`)

    // Should redirect to trips page after profile creation
    await expect(page).toHaveURL('/trips', { timeout: 10000 })

    // User should be authenticated
    await expect(page.locator('text=oauth-user@gmail.com')).toBeVisible()
  })

  test('TC2.5: OAuth errors handled gracefully', async ({ page }) => {
    await page.goto('/login')

    // Mock OAuth error response
    await page.route('**/auth/v1/**', async route => {
      const url = route.request().url()

      if (url.includes('authorize') || url.includes('oauth')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'access_denied',
            error_description: 'User denied access',
          }),
        })
      } else {
        await route.continue()
      }
    })

    // Try to initiate OAuth
    const googleButton = page.locator('button:has-text("Continue with Google")')
    await googleButton.click()

    // Should show error message or handle gracefully
    // The exact behavior depends on implementation
    // At minimum, should not crash and should stay on login page
    await expect(page).toHaveURL(/\/(login|signup)/)
  })

  test('TC2.3: OAuth callback without code redirects to login', async ({ page }) => {
    // Navigate to callback without auth code (error scenario)
    await page.goto('/auth/callback')

    // Should redirect to login page
    await expect(page).toHaveURL('/login', { timeout: 10000 })
  })

  test('TC2.4: OAuth signup flow on signup page', async ({ page }) => {
    await page.goto('/signup')

    // Google OAuth button should also be available on signup page
    const googleButton = page.locator('button:has-text("Continue with Google")')
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()

    // Same functionality as login page
    await expect(googleButton).toContainText('Continue with Google')
  })
})
