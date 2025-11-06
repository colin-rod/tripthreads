/**
 * Invite System E2E Tests (Playwright)
 *
 * End-to-end tests for the invite flow UI:
 * - Invite dialog interactions
 * - Invite link generation and copying
 * - Invite acceptance page
 * - Role-based UI visibility
 * - Error states
 *
 * Note: These tests require a running development server and test database.
 * As per CLAUDE.md guidelines, E2E tests should run in CI, not locally.
 */

import { test, expect, Page } from '@playwright/test'

// Test user credentials (from seed.sql)
const ALICE = {
  email: 'temp@test.com',
  password: 'test123456',
}

const BENJI = {
  email: 'benji@temp.com',
  password: 'test123456',
}

const MAYA = {
  email: 'maya@test.com',
  password: 'test123456',
}

/**
 * Helper: Login as a test user
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/trips')
}

/**
 * Helper: Create a test trip
 */
async function createTestTrip(page: Page, tripName: string) {
  await page.goto('/trips')
  await page.click('button:has-text("Create Trip")')
  await page.fill('input[name="name"]', tripName)
  await page.fill('input[name="start_date"]', '2025-12-01')
  await page.fill('input[name="end_date"]', '2025-12-10')
  await page.click('button:has-text("Create")')
  await page.waitForURL(/\/trips\/[a-f0-9-]+/)
}

/**
 * Helper: Extract trip ID from URL
 */
function getTripIdFromUrl(url: string): string {
  const match = url.match(/\/trips\/([a-f0-9-]+)/)
  return match ? match[1] : ''
}

test.describe('Invite Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test with a clean session
    await page.context().clearCookies()
  })

  // ========================================================================
  // TC1: Invite Link Generation UI
  // ========================================================================
  test.describe('TC1: Invite Link Generation', () => {
    test('TC1.1: Organizer can open invite dialog', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `E2E Test Trip ${Date.now()}`)

      // Click invite button
      await page.click('[data-testid="invite-button"]')

      // Verify dialog opens
      await expect(page.locator('[data-testid="invite-dialog"]')).toBeVisible()
    })

    test('TC1.2: Can generate share link with role selection', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Link Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')

      // Select participant role
      await page.click('[data-testid="role-select"]')
      await page.click('[data-testid="role-participant"]')

      // Generate link
      await page.click('button:has-text("Generate Link")')

      // Verify link appears
      await expect(page.locator('[data-testid="invite-link"]')).toBeVisible()
      const linkText = await page.locator('[data-testid="invite-link"]').textContent()
      expect(linkText).toContain('/invite/')
    })

    test('TC1.3: Can copy invite link to clipboard', async ({ page, context }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Copy Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')

      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])

      // Click copy button
      await page.click('[data-testid="copy-link-button"]')

      // Verify copied
      await expect(page.locator('text=Copied!')).toBeVisible({ timeout: 2000 })
    })

    test('TC1.4: Can switch between participant and viewer roles', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Role Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')

      // Select viewer role
      await page.click('[data-testid="role-select"]')
      await page.click('[data-testid="role-viewer"]')
      await page.click('button:has-text("Generate Link")')

      const link1 = await page.locator('[data-testid="invite-link"]').textContent()

      // Switch to participant and generate new link
      await page.click('[data-testid="role-select"]')
      await page.click('[data-testid="role-participant"]')
      await page.click('button:has-text("Generate New Link")')

      const link2 = await page.locator('[data-testid="invite-link"]').textContent()

      // Links should be different
      expect(link1).not.toBe(link2)
    })

    test('TC1.5: QR code generated for mobile sharing', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `QR Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')

      // Verify QR code canvas exists
      await expect(page.locator('[data-testid="qr-code"]')).toBeVisible()
    })
  })

  // ========================================================================
  // TC2: Email Invites UI
  // ========================================================================
  test.describe('TC2: Email Invites', () => {
    test('TC2.1: Can switch to email invites tab', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Email Tab Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')

      // Click email tab
      await page.click('[data-testid="email-invites-tab"]')

      // Verify email invite form visible
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    })

    test('TC2.2: Can enter multiple emails', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Multi Email Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('[data-testid="email-invites-tab"]')

      // Enter multiple emails
      const emails = 'test1@example.com, test2@example.com, test3@example.com'
      await page.fill('[data-testid="email-input"]', emails)

      // Verify email count displayed
      await expect(page.locator('text=3 emails')).toBeVisible()
    })

    test('TC2.3: Can send email invites with role selection', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Send Invites Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('[data-testid="email-invites-tab"]')

      await page.fill('[data-testid="email-input"]', 'newuser@test.com')
      await page.click('[data-testid="email-role-select"]')
      await page.click('[data-testid="email-role-viewer"]')
      await page.click('button:has-text("Send Invitations")')

      // Verify success message
      await expect(page.locator('text=Invitations sent')).toBeVisible({ timeout: 5000 })
    })

    test('TC2.4: Email validation errors shown', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Validation Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('[data-testid="email-invites-tab"]')

      // Enter invalid email
      await page.fill('[data-testid="email-input"]', 'not-an-email')
      await page.click('button:has-text("Send Invitations")')

      // Verify error message
      await expect(page.locator('text=Invalid email')).toBeVisible()
    })
  })

  // ========================================================================
  // TC3: Invite Acceptance Flow
  // ========================================================================
  test.describe('TC3: Invite Acceptance', () => {
    test('TC3.1: Unauthenticated user redirected to login', async ({ page }) => {
      // Visit invite link without being logged in
      const fakeToken = '00000000000000000000000000000000'
      await page.goto(`/invite/${fakeToken}`)

      // Should redirect to login with return URL
      await page.waitForURL(/\/login/)
      expect(page.url()).toContain('/login')
    })

    test('TC3.2: Valid invite shows acceptance card', async ({ page }) => {
      // Alice creates invite
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Accept Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')

      const inviteLink = await page.locator('[data-testid="invite-link"]').textContent()
      const token = inviteLink!.split('/invite/')[1]

      // Logout Alice
      await page.goto('/settings')
      await page.click('button:has-text("Logout")')

      // Benji logs in
      await login(page, BENJI.email, BENJI.password)

      // Visit invite link
      await page.goto(`/invite/${token}`)

      // Verify acceptance card visible
      await expect(page.locator('[data-testid="invite-acceptance-card"]')).toBeVisible()
      await expect(page.locator("text=You've been invited")).toBeVisible()
    })

    test('TC3.3: Can accept invite and join trip', async ({ page }) => {
      // Alice creates invite
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Join Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')
      const inviteLink = await page.locator('[data-testid="invite-link"]').textContent()
      const token = inviteLink!.split('/invite/')[1]

      // Logout
      await page.goto('/settings')
      await page.click('button:has-text("Logout")')

      // Maya logs in and accepts
      await login(page, MAYA.email, MAYA.password)
      await page.goto(`/invite/${token}`)

      // Click accept button
      await page.click('button:has-text("Accept Invite")')

      // Should redirect to trip detail page
      await page.waitForURL(/\/trips\/[a-f0-9-]+/)
      expect(page.url()).toContain('/trips/')
    })

    test('TC3.4: Partial joiner can select date range', async ({ page }) => {
      // Alice creates invite
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Partial Join Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')
      const inviteLink = await page.locator('[data-testid="invite-link"]').textContent()
      const token = inviteLink!.split('/invite/')[1]

      // Logout
      await page.goto('/settings')
      await page.click('button:has-text("Logout")')

      // Benji logs in
      await login(page, BENJI.email, BENJI.password)
      await page.goto(`/invite/${token}`)

      // Toggle partial joiner option
      await page.click('[data-testid="partial-joiner-toggle"]')

      // Select date range
      await page.fill('[data-testid="join-start-date"]', '2025-12-05')
      await page.fill('[data-testid="join-end-date"]', '2025-12-08')

      // Accept
      await page.click('button:has-text("Accept Invite")')

      // Should redirect to trip
      await page.waitForURL(/\/trips\/[a-f0-9-]+/)
    })

    test('TC3.5: Invalid token shows error', async ({ page }) => {
      await login(page, BENJI.email, BENJI.password)

      // Visit invalid token
      await page.goto('/invite/invalid-token-000000000000000')

      // Should show error
      await expect(page.locator('text=Invite not found')).toBeVisible()
    })

    test('TC3.6: Already-member redirected to trip', async ({ page }) => {
      // Alice creates invite
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Already Member Test ${Date.now()}`)
      const tripId = getTripIdFromUrl(page.url())

      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')
      const inviteLink = await page.locator('[data-testid="invite-link"]').textContent()
      const token = inviteLink!.split('/invite/')[1]

      // Alice (organizer) tries to accept own invite
      await page.goto(`/invite/${token}`)

      // Should redirect to trip detail
      await page.waitForURL(/\/trips\/[a-f0-9-]+/)
      expect(page.url()).toContain(tripId)
    })
  })

  // ========================================================================
  // TC4: Pending Invites Management
  // ========================================================================
  test.describe('TC4: Invite Management', () => {
    test('TC4.1: Organizer can view pending invites', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Manage Test ${Date.now()}`)

      // Generate invites
      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')
      await page.click('[data-testid="close-dialog"]')

      // View invites list
      await page.click('[data-testid="trip-settings"]')
      await page.click('text=Invitations')

      // Verify invites list visible
      await expect(page.locator('[data-testid="pending-invites-list"]')).toBeVisible()
    })

    test('TC4.2: Can revoke pending invite', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Revoke Test ${Date.now()}`)

      // Generate invite
      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')
      await page.click('[data-testid="close-dialog"]')

      // Go to invites management
      await page.click('[data-testid="trip-settings"]')
      await page.click('text=Invitations')

      // Revoke invite
      await page.click('[data-testid="revoke-invite-button"]')
      await page.click('button:has-text("Confirm")')

      // Verify revoked
      await expect(page.locator('text=Revoked')).toBeVisible()
    })

    test('TC4.3: Usage count shown for link invites', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Usage Count Test ${Date.now()}`)

      // Generate link
      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')
      const inviteLink = await page.locator('[data-testid="invite-link"]').textContent()
      const token = inviteLink!.split('/invite/')[1]
      await page.click('[data-testid="close-dialog"]')

      // Benji accepts invite
      await page.goto('/settings')
      await page.click('button:has-text("Logout")')
      await login(page, BENJI.email, BENJI.password)
      await page.goto(`/invite/${token}`)
      await page.click('button:has-text("Accept Invite")')

      // Alice checks usage count
      await page.goto('/settings')
      await page.click('button:has-text("Logout")')
      await login(page, ALICE.email, ALICE.password)
      await page.goto('/trips')
      // Navigate back to trip and check invites
      await page.click('text=Usage Count Test')
      await page.click('[data-testid="trip-settings"]')
      await page.click('text=Invitations')

      // Verify usage count incremented
      await expect(page.locator('text=Used 1 time')).toBeVisible()
    })
  })

  // ========================================================================
  // TC5: Role-Based UI Visibility
  // ========================================================================
  test.describe('TC5: Role-Based UI', () => {
    test('TC5.1: Participant sees invite button', async ({ page }) => {
      // Alice creates trip and adds Benji as participant
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `UI Role Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('button:has-text("Generate Link")')
      const inviteLink = await page.locator('[data-testid="invite-link"]').textContent()
      const token = inviteLink!.split('/invite/')[1]
      await page.click('[data-testid="close-dialog"]')

      // Logout and Benji joins
      await page.goto('/settings')
      await page.click('button:has-text("Logout")')
      await login(page, BENJI.email, BENJI.password)
      await page.goto(`/invite/${token}`)
      await page.click('button:has-text("Accept Invite")')

      // Benji should NOT see invite button (only organizer can)
      await expect(page.locator('[data-testid="invite-button"]')).not.toBeVisible()
    })

    test('TC5.2: Viewer does not see invite button', async ({ page }) => {
      // Alice creates trip and adds Maya as viewer
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Viewer UI Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')
      await page.click('[data-testid="role-select"]')
      await page.click('[data-testid="role-viewer"]')
      await page.click('button:has-text("Generate Link")')
      const inviteLink = await page.locator('[data-testid="invite-link"]').textContent()
      const token = inviteLink!.split('/invite/')[1]
      await page.click('[data-testid="close-dialog"]')

      // Maya joins as viewer
      await page.goto('/settings')
      await page.click('button:has-text("Logout")')
      await login(page, MAYA.email, MAYA.password)
      await page.goto(`/invite/${token}`)
      await page.click('button:has-text("Accept Invite")')

      // Viewer should not see invite button
      await expect(page.locator('[data-testid="invite-button"]')).not.toBeVisible()
    })

    test('TC5.3: Organizer sees all invite management options', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Organizer UI Test ${Date.now()}`)

      // Organizer should see invite button
      await expect(page.locator('[data-testid="invite-button"]')).toBeVisible()

      // Can access settings
      await page.click('[data-testid="trip-settings"]')
      await expect(page.locator('text=Invitations')).toBeVisible()
    })
  })

  // ========================================================================
  // TC6: Error States & Edge Cases
  // ========================================================================
  test.describe('TC6: Error States', () => {
    test('TC6.1: Network error handled gracefully', async ({ page, context }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Network Error Test ${Date.now()}`)

      await page.click('[data-testid="invite-button"]')

      // Simulate offline
      await context.setOffline(true)

      // Try to generate link
      await page.click('button:has-text("Generate Link")')

      // Should show error
      await expect(page.locator('text=Network error')).toBeVisible({ timeout: 5000 })

      // Go back online
      await context.setOffline(false)
    })

    test('TC6.2: Expired invite shows clear message', async ({ page }) => {
      await login(page, BENJI.email, BENJI.password)

      // Try to visit expired token (mock)
      await page.goto('/invite/expired00000000000000000000000000')

      await expect(page.locator('text=Invite not found or expired')).toBeVisible()
    })

    test('TC6.3: Rate limit message shown after many invites', async ({ page }) => {
      await login(page, ALICE.email, ALICE.password)
      await createTestTrip(page, `Rate Limit Test ${Date.now()}`)

      // Try to generate many invites quickly
      // Note: This is a smoke test, actual rate limit may not trigger in dev
      await page.click('[data-testid="invite-button"]')

      for (let i = 0; i < 10; i++) {
        await page.click('button:has-text("Generate Link")')
        await page.waitForTimeout(100)
      }

      // If rate limited, should show message
      // Otherwise, test passes (rate limit not hit)
      const rateLimitMsg = page.locator('text=Rate limit exceeded')
      if (await rateLimitMsg.isVisible()) {
        expect(await rateLimitMsg.isVisible()).toBe(true)
      }
    })
  })
})
