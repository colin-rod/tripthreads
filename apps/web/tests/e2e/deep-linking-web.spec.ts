import { test, expect } from '@playwright/test'

/**
 * Web Deep Linking Fallback Tests
 *
 * Test Case:
 * - TC1.2: Invite link opens web fallback when app not installed
 *
 * This ensures that users without the mobile app can still
 * access invite links via the web interface.
 */

test.describe('Web Deep Linking Fallback', () => {
  const testInviteToken = 'test-invite-token-123'
  const testTripId = 'test-trip-deep-link'

  test('TC1.2: Should show web invite page when app not installed', async ({ page }) => {
    // Navigate to invite page (simulates clicking invite link without app)
    await page.goto(`/invite/${testInviteToken}`)

    // Should show invite page
    await expect(page.getByText('Trip Invitation')).toBeVisible()

    // Should show invite details
    await expect(page.getByText(/invited to join/i)).toBeVisible()

    // Should have action buttons
    await expect(page.getByRole('button', { name: /Accept/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Decline/i })).toBeVisible()
  })

  test('TC1.2b: Should show trip page when navigating to trip link', async ({ page }) => {
    // Login first (trip requires auth)
    await page.goto('/login')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: /Sign in/i }).click()

    // Navigate to trip page
    await page.goto(`/trips/${testTripId}`)

    // Should show trip detail page
    await expect(page.getByText(/Itinerary|Expenses|Chat/i)).toBeVisible()
  })

  test('TC1.2c: Should handle expired invite gracefully', async ({ page }) => {
    // Navigate to invite with invalid token
    await page.goto('/invite/invalid-token-999')

    // Should show error message
    await expect(page.getByText(/not found|expired|invalid/i)).toBeVisible()
  })

  test('TC1.2d: Should redirect to login when accessing trip unauthenticated', async ({ page }) => {
    // Navigate to trip page without authentication
    await page.goto(`/trips/${testTripId}`)

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)

    // Should preserve redirect URL
    await expect(page).toHaveURL(new RegExp(`redirect.*trips.*${testTripId}`))
  })
})
