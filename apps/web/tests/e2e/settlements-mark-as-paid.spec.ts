/**
 * E2E tests for marking settlements as paid
 *
 * Tests the complete user flow from viewing pending settlements
 * to marking them as paid with notes, and viewing settlement history.
 *
 * IMPORTANT: These tests should only run in CI, not locally.
 */

import { test, expect } from '@playwright/test'

// Test data
const TEST_TRIP_ID = '00000000-0000-0000-0000-000000000001'
const ALICE_EMAIL = 'alice@test.com'
const BENJI_EMAIL = 'benji@test.com'

test.describe('Settlement Mark as Paid Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Benji (debtor)
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', BENJI_EMAIL)
    await page.fill('[data-testid="password-input"]', 'test-password')
    await page.click('[data-testid="login-button"]')

    // Navigate to trip page
    await page.goto(`/trips/${TEST_TRIP_ID}`)
    await page.waitForLoadState('networkidle')
  })

  test('should display pending settlements section', async ({ page }) => {
    // Should show settlements card
    await expect(page.locator('text=Settlements')).toBeVisible()
    await expect(page.locator('text=Pending Transfers')).toBeVisible()

    // Should show at least one pending settlement
    await expect(page.locator('text=Mark as Paid').first()).toBeVisible()
  })

  test('should show settlement details in card', async ({ page }) => {
    // Should show user names and amount
    await expect(page.locator('text=You')).toBeVisible() // Benji is debtor
    await expect(page.locator('text=Alice Johnson')).toBeVisible()
    await expect(page.locator('[data-testid="settlement-amount"]').first()).toBeVisible()
  })

  test('should open dialog when "Mark as Paid" is clicked', async ({ page }) => {
    // Click "Mark as Paid" button
    await page.click('button:has-text("Mark as Paid")')

    // Dialog should be visible
    await expect(page.locator('role=dialog')).toBeVisible()
    await expect(page.locator('text=Mark as Paid')).toBeVisible()
    await expect(page.locator('text=Confirm that this payment has been completed')).toBeVisible()
  })

  test('should display settlement details in dialog', async ({ page }) => {
    await page.click('button:has-text("Mark as Paid")')

    // Should show settlement details
    await expect(page.locator('role=dialog >> text=You')).toBeVisible()
    await expect(page.locator('role=dialog >> text=Alice Johnson')).toBeVisible()

    // Should show amount
    const amount = page.locator('role=dialog').locator('[class*="text-primary"]')
    await expect(amount).toBeVisible()
  })

  test('should allow entering a payment note', async ({ page }) => {
    await page.click('button:has-text("Mark as Paid")')

    // Enter note
    const noteField = page.locator('textarea[placeholder*="Paid via"]')
    await noteField.fill('Paid via Venmo on Jan 29')

    // Note should be visible
    await expect(noteField).toHaveValue('Paid via Venmo on Jan 29')
  })

  test('should close dialog when Cancel is clicked', async ({ page }) => {
    await page.click('button:has-text("Mark as Paid")')

    // Dialog should be open
    await expect(page.locator('role=dialog')).toBeVisible()

    // Click Cancel
    await page.click('role=dialog >> button:has-text("Cancel")')

    // Dialog should be closed
    await expect(page.locator('role=dialog')).not.toBeVisible()
  })

  test('should mark settlement as paid without note', async ({ page }) => {
    // Get initial pending count
    const initialDescription = await page.locator('text=/\\d+ pending transfer/').textContent()

    // Click "Mark as Paid"
    await page.click('button:has-text("Mark as Paid")')

    // Confirm without adding note
    await page.click('role=dialog >> button:has-text("Confirm Payment")')

    // Should show success toast
    await expect(page.locator('text=Settlement marked as paid')).toBeVisible()

    // Dialog should close
    await expect(page.locator('role=dialog')).not.toBeVisible()

    // Pending count should decrease (or section should disappear)
    await page.waitForTimeout(1000) // Wait for revalidation
    const updatedDescription = await page.locator('text=/settled|pending/').textContent()
    expect(updatedDescription).not.toBe(initialDescription)
  })

  test('should mark settlement as paid with note', async ({ page }) => {
    await page.click('button:has-text("Mark as Paid")')

    // Enter note
    await page.fill('textarea[placeholder*="Paid via"]', 'Paid via bank transfer')

    // Confirm
    await page.click('role=dialog >> button:has-text("Confirm Payment")')

    // Should show success toast
    await expect(page.locator('text=Settlement marked as paid')).toBeVisible()

    // Should close dialog
    await expect(page.locator('role=dialog')).not.toBeVisible()
  })

  test('should move settlement to history after marking as paid', async ({ page }) => {
    // Mark settlement as paid
    await page.click('button:has-text("Mark as Paid")')
    await page.fill('textarea[placeholder*="Paid via"]', 'Test payment')
    await page.click('role=dialog >> button:has-text("Confirm Payment")')

    // Wait for toast to appear
    await expect(page.locator('text=Settlement marked as paid')).toBeVisible()

    // Wait for revalidation
    await page.waitForTimeout(2000)

    // Should show settlement history section
    await expect(page.locator('text=/Settlement History \\(\\d+\\)/')).toBeVisible()

    // Expand history
    await page.click('button:has-text("Settlement History")')

    // Should show "Settled" badge
    await expect(page.locator('text=Settled')).toBeVisible()

    // Should show the note
    await expect(page.locator('text=Test payment')).toBeVisible()
  })

  test('should show relative timestamp for settled settlements', async ({ page }) => {
    // Mark settlement as paid
    await page.click('button:has-text("Mark as Paid")')
    await page.click('role=dialog >> button:has-text("Confirm Payment")')
    await page.waitForTimeout(2000)

    // Expand history
    await page.click('button:has-text("Settlement History")')

    // Should show relative timestamp (e.g., "2 minutes ago")
    await expect(page.locator('text=/ago/')).toBeVisible()
  })

  test('should persist settlement history toggle state', async ({ page }) => {
    // Ensure there's at least one settled settlement
    await page.click('button:has-text("Mark as Paid")')
    await page.click('role=dialog >> button:has-text("Confirm Payment")')
    await page.waitForTimeout(2000)

    // Expand history
    await page.click('button:has-text("Settlement History")')
    await expect(page.locator('text=Settled')).toBeVisible()

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // History should still be expanded
    await expect(page.locator('text=Settled')).toBeVisible()
  })

  test('should show error toast if marking as paid fails', async ({ page }) => {
    // Mock API failure by intercepting the server action
    await page.route('**/api/trpc/**', route => {
      route.fulfill({ status: 500, body: 'Server error' })
    })

    await page.click('button:has-text("Mark as Paid")')
    await page.click('role=dialog >> button:has-text("Confirm Payment")')

    // Should show error toast
    await expect(
      page.locator('text=/Failed to mark settlement as paid|An error occurred/')
    ).toBeVisible()
  })

  test('should allow creditor to mark settlement as paid', async ({ page }) => {
    // Logout Benji
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Logout')

    // Login as Alice (creditor)
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', ALICE_EMAIL)
    await page.fill('[data-testid="password-input"]', 'test-password')
    await page.click('[data-testid="login-button"]')

    // Navigate to trip
    await page.goto(`/trips/${TEST_TRIP_ID}`)
    await page.waitForLoadState('networkidle')

    // Should see "Mark as Paid" button (Alice is creditor)
    await expect(page.locator('button:has-text("Mark as Paid")').first()).toBeVisible()

    // Should be able to mark as paid
    await page.click('button:has-text("Mark as Paid")')
    await page.fill('textarea[placeholder*="Paid via"]', 'Received payment')
    await page.click('role=dialog >> button:has-text("Confirm Payment")')

    // Should show success
    await expect(page.locator('text=Settlement marked as paid')).toBeVisible()
  })

  test('should handle multiple settlements correctly', async ({ page }) => {
    // Get initial count of "Mark as Paid" buttons
    const initialButtons = await page.locator('button:has-text("Mark as Paid")').count()

    if (initialButtons > 1) {
      // Mark first settlement as paid
      await page.locator('button:has-text("Mark as Paid")').first().click()
      await page.click('role=dialog >> button:has-text("Confirm Payment")')
      await page.waitForTimeout(2000)

      // Should still have remaining settlements
      const remainingButtons = await page.locator('button:has-text("Mark as Paid")').count()
      expect(remainingButtons).toBe(initialButtons - 1)
    }
  })

  test('should collapse and expand settlements section', async ({ page }) => {
    // Should show content initially
    await expect(page.locator('text=Pending Transfers')).toBeVisible()

    // Click collapse button (chevron in header)
    await page.click('[data-testid="collapse-settlements"]')

    // Content should be hidden
    await expect(page.locator('text=Pending Transfers')).not.toBeVisible()

    // Click expand button
    await page.click('[data-testid="collapse-settlements"]')

    // Content should be visible again
    await expect(page.locator('text=Pending Transfers')).toBeVisible()
  })

  test('should show individual balances when expanded', async ({ page }) => {
    // Individual balances should be hidden initially
    await expect(page.locator('text=Individual Balances')).toBeVisible()

    // User names should not be visible in balances section initially
    const balancesSectionVisible = await page
      .locator('[data-testid="user-balance-card"]')
      .isVisible()
      .catch(() => false)
    expect(balancesSectionVisible).toBe(false)

    // Click to expand
    await page.click('button:has-text("Individual Balances")')

    // Should show user balances
    await expect(page.locator('[data-testid="user-balance-card"]').first()).toBeVisible()
  })

  test('should handle dialog reset on cancel', async ({ page }) => {
    // Open dialog and enter note
    await page.click('button:has-text("Mark as Paid")')
    await page.fill('textarea[placeholder*="Paid via"]', 'Some note')

    // Cancel
    await page.click('role=dialog >> button:has-text("Cancel")')

    // Reopen dialog
    await page.click('button:has-text("Mark as Paid")')

    // Note should be cleared
    const noteField = page.locator('textarea[placeholder*="Paid via"]')
    await expect(noteField).toHaveValue('')
  })
})

test.describe('Settlement History View', () => {
  test('should display settled settlements with proper styling', async ({ page }) => {
    // Login as Benji
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', BENJI_EMAIL)
    await page.fill('[data-testid="password-input"]', 'test-password')
    await page.click('[data-testid="login-button"]')

    await page.goto(`/trips/${TEST_TRIP_ID}`)
    await page.waitForLoadState('networkidle')

    // Check if there are settled settlements
    const hasSettledHistory = await page.locator('text=Settlement History').isVisible()

    if (hasSettledHistory) {
      // Expand history
      await page.click('button:has-text("Settlement History")')

      // Should show "Settled" badge
      await expect(page.locator('text=Settled').first()).toBeVisible()

      // Settled settlements should have reduced opacity
      const settledCard = page.locator('text=Settled').locator('..')
      await expect(settledCard).toHaveCSS('opacity', '0.75')
    }
  })

  test('should not show "Mark as Paid" button for settled settlements', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', BENJI_EMAIL)
    await page.fill('[data-testid="password-input"]', 'test-password')
    await page.click('[data-testid="login-button"]')

    await page.goto(`/trips/${TEST_TRIP_ID}`)
    await page.waitForLoadState('networkidle')

    const hasSettledHistory = await page.locator('text=Settlement History').isVisible()

    if (hasSettledHistory) {
      await page.click('button:has-text("Settlement History")')

      // Settled settlements should not have "Mark as Paid" button
      const settledSection = page.locator('text=Settlement History').locator('..')
      const markAsPaidInSettled = settledSection.locator('button:has-text("Mark as Paid")')
      await expect(markAsPaidInSettled).not.toBeVisible()
    }
  })
})
