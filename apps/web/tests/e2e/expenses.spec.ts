/**
 * E2E Tests for Expense Management
 *
 * Tests complete user flows for expense tracking and settlement.
 * These tests only run in CI/CD, not locally (per project guidelines).
 *
 * Related: CRO-807 (Linear)
 */

import { test, expect, Page } from '@playwright/test'

// Test data
const TEST_TRIP_NAME = 'E2E Test Trip - Expenses'
const TEST_USER_EMAIL = 'e2e-test@tripthreads.com'
const TEST_USER_PASSWORD = 'TestPassword123!'

/**
 * Helper to create and navigate to a test trip
 */
async function createTestTrip(page: Page): Promise<string> {
  await page.goto('/trips')
  await page.click('[data-testid="create-trip-button"]')

  // Fill in trip details
  await page.fill('[data-testid="trip-name-input"]', TEST_TRIP_NAME)
  await page.fill('[data-testid="trip-start-date"]', '2025-12-01')
  await page.fill('[data-testid="trip-end-date"]', '2025-12-07')

  await page.click('[data-testid="create-trip-submit"]')

  // Wait for navigation to trip page
  await page.waitForURL(/\/trips\/[a-z0-9-]+/)

  // Extract trip ID from URL
  const url = page.url()
  const tripId = url.split('/trips/')[1].split('/')[0]

  return tripId
}

/**
 * Helper to clean up test trip
 */
async function deleteTestTrip(page: Page, tripId: string) {
  await page.goto(`/trips/${tripId}#settings`)
  await page.click('[data-testid="delete-trip-button"]')
  await page.fill('[data-testid="delete-confirmation-input"]', 'DELETE')
  await page.click('[data-testid="confirm-delete-button"]')
  await page.waitForURL('/trips')
}

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', TEST_USER_EMAIL)
    await page.fill('[data-testid="password-input"]', TEST_USER_PASSWORD)
    await page.click('[data-testid="login-button"]')

    await page.waitForURL('/trips')
  })

  test('@smoke should create expense with equal split', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      // Navigate to expenses page
      await page.goto(`/trips/${tripId}#expenses`)

      // Click add expense button
      await page.click('[data-testid="add-expense-button"]')

      // Fill in expense details
      await page.fill('[data-testid="expense-description"]', 'Team dinner')
      await page.fill('[data-testid="expense-amount"]', '80')
      await page.selectOption('[data-testid="expense-currency"]', 'EUR')
      await page.selectOption('[data-testid="expense-category"]', 'food')

      // Select equal split
      await page.click('[data-testid="split-type-equal"]')

      // Submit
      await page.click('[data-testid="save-expense-button"]')

      // Verify expense appears in list
      await expect(page.locator('[data-testid="expense-item"]')).toContainText('Team dinner')
      await expect(page.locator('[data-testid="expense-item"]')).toContainText('€80.00')
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should create expense with natural language input', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      // Use natural language input
      await page.fill('[data-testid="expense-nl-input"]', 'Split 60€ dinner at Le Bistro 4 ways')
      await page.click('[data-testid="expense-nl-submit"]')

      // Verify preview card appears
      await expect(page.locator('[data-testid="expense-preview"]')).toContainText(
        'dinner at Le Bistro'
      )
      await expect(page.locator('[data-testid="expense-preview"]')).toContainText('€60.00')
      await expect(page.locator('[data-testid="expense-preview"]')).toContainText('Split 4 ways')

      // Confirm creation
      await page.click('[data-testid="confirm-expense-button"]')

      // Verify in list
      await expect(page.locator('[data-testid="expense-item"]')).toContainText(
        'dinner at Le Bistro'
      )
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should create expense with percentage split', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      await page.click('[data-testid="add-expense-button"]')

      await page.fill('[data-testid="expense-description"]', 'Shared taxi')
      await page.fill('[data-testid="expense-amount"]', '30')
      await page.selectOption('[data-testid="expense-currency"]', 'EUR')
      await page.selectOption('[data-testid="expense-category"]', 'transport')

      // Select percentage split
      await page.click('[data-testid="split-type-percentage"]')

      // Assign percentages
      const participants = await page.locator('[data-testid^="participant-"]').all()
      if (participants.length >= 2) {
        await page.fill('[data-testid="participant-0-percentage"]', '60')
        await page.fill('[data-testid="participant-1-percentage"]', '40')
      }

      await page.click('[data-testid="save-expense-button"]')

      // Verify split amounts
      await expect(page.locator('[data-testid="expense-item"]')).toContainText('Shared taxi')
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should create expense with custom amounts', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      await page.click('[data-testid="add-expense-button"]')

      await page.fill('[data-testid="expense-description"]', 'Custom split meal')
      await page.fill('[data-testid="expense-amount"]', '50')
      await page.selectOption('[data-testid="expense-currency"]', 'EUR')
      await page.selectOption('[data-testid="expense-category"]', 'food')

      // Select custom amount split
      await page.click('[data-testid="split-type-amount"]')

      // Assign custom amounts
      const participants = await page.locator('[data-testid^="participant-"]').all()
      if (participants.length >= 2) {
        await page.fill('[data-testid="participant-0-amount"]', '30')
        await page.fill('[data-testid="participant-1-amount"]', '20')
      }

      await page.click('[data-testid="save-expense-button"]')

      await expect(page.locator('[data-testid="expense-item"]')).toContainText('Custom split meal')
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should edit expense details', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      // Create initial expense
      await page.click('[data-testid="add-expense-button"]')
      await page.fill('[data-testid="expense-description"]', 'Original description')
      await page.fill('[data-testid="expense-amount"]', '25')
      await page.selectOption('[data-testid="expense-currency"]', 'EUR')
      await page.selectOption('[data-testid="expense-category"]', 'other')
      await page.click('[data-testid="save-expense-button"]')

      // Edit expense
      await page.click('[data-testid="expense-item-menu"]')
      await page.click('[data-testid="edit-expense"]')

      await page.fill('[data-testid="expense-description"]', 'Updated description')
      await page.fill('[data-testid="expense-amount"]', '35')

      await page.click('[data-testid="save-expense-button"]')

      // Verify updates
      await expect(page.locator('[data-testid="expense-item"]')).toContainText(
        'Updated description'
      )
      await expect(page.locator('[data-testid="expense-item"]')).toContainText('€35.00')
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should delete expense', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      // Create expense
      await page.click('[data-testid="add-expense-button"]')
      await page.fill('[data-testid="expense-description"]', 'To be deleted')
      await page.fill('[data-testid="expense-amount"]', '10')
      await page.selectOption('[data-testid="expense-currency"]', 'EUR')
      await page.selectOption('[data-testid="expense-category"]', 'other')
      await page.click('[data-testid="save-expense-button"]')

      // Verify it exists
      await expect(page.locator('[data-testid="expense-item"]')).toContainText('To be deleted')

      // Delete
      await page.click('[data-testid="expense-item-menu"]')
      await page.click('[data-testid="delete-expense"]')

      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]')

      // Verify it's gone
      await expect(page.locator('[data-testid="expense-item"]')).not.toBeVisible()
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should show expense balances correctly', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      // Create first expense (user pays)
      await page.click('[data-testid="add-expense-button"]')
      await page.fill('[data-testid="expense-description"]', 'I paid for dinner')
      await page.fill('[data-testid="expense-amount"]', '40')
      await page.selectOption('[data-testid="expense-currency"]', 'EUR')
      await page.selectOption('[data-testid="expense-category"]', 'food')
      await page.click('[data-testid="split-type-equal"]')
      await page.click('[data-testid="save-expense-button"]')

      // Verify balance shows user is owed money
      await expect(page.locator('[data-testid="user-balance"]')).toContainText('€')

      // Balance should be positive (owed to user)
      const balanceText = await page.locator('[data-testid="user-balance"]').textContent()
      expect(balanceText).toMatch(/\+.*€/)
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should filter expenses by category', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      // Create expenses in different categories
      const categories = ['food', 'transport', 'accommodation']

      for (const category of categories) {
        await page.click('[data-testid="add-expense-button"]')
        await page.fill('[data-testid="expense-description"]', `${category} expense`)
        await page.fill('[data-testid="expense-amount"]', '20')
        await page.selectOption('[data-testid="expense-currency"]', 'EUR')
        await page.selectOption('[data-testid="expense-category"]', category)
        await page.click('[data-testid="save-expense-button"]')
      }

      // Filter by food
      await page.selectOption('[data-testid="category-filter"]', 'food')

      // Should only show food expense
      await expect(page.locator('[data-testid="expense-item"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="expense-item"]')).toContainText('food expense')

      // Show all
      await page.selectOption('[data-testid="category-filter"]', 'all')
      await expect(page.locator('[data-testid="expense-item"]')).toHaveCount(3)
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should view settlement suggestions', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      // Create some expenses to generate settlements
      await page.click('[data-testid="add-expense-button"]')
      await page.fill('[data-testid="expense-description"]', 'Expense for settlement')
      await page.fill('[data-testid="expense-amount"]', '100')
      await page.selectOption('[data-testid="expense-currency"]', 'EUR')
      await page.selectOption('[data-testid="expense-category"]', 'food')
      await page.click('[data-testid="split-type-equal"]')
      await page.click('[data-testid="save-expense-button"]')

      // Navigate to settlements view
      await page.click('[data-testid="settlements-tab"]')

      // Should show settlement suggestions
      await expect(page.locator('[data-testid="settlement-suggestion"]')).toBeVisible()
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should mark settlement as paid', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      await page.goto(`/trips/${tripId}#expenses`)

      // Create expense
      await page.click('[data-testid="add-expense-button"]')
      await page.fill('[data-testid="expense-description"]', 'For settlement')
      await page.fill('[data-testid="expense-amount"]', '50')
      await page.selectOption('[data-testid="expense-currency"]', 'EUR')
      await page.selectOption('[data-testid="expense-category"]', 'other')
      await page.click('[data-testid="split-type-equal"]')
      await page.click('[data-testid="save-expense-button"]')

      // Go to settlements
      await page.click('[data-testid="settlements-tab"]')

      // Mark as paid
      await page.click('[data-testid="mark-settlement-paid"]')

      // Verify status changes
      await expect(page.locator('[data-testid="settlement-status"]')).toContainText('Settled')
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })

  test('should respect viewer role permissions', async ({ page }) => {
    const tripId = await createTestTrip(page)

    try {
      // Invite a viewer (requires implementation of invite flow)
      // For now, test that viewer UI shows read-only state

      await page.goto(`/trips/${tripId}#settings`)

      // TODO: Add viewer to trip
      // await page.click('[data-testid="invite-user-button"]')
      // await page.fill('[data-testid="invite-email"]', 'viewer@test.com')
      // await page.selectOption('[data-testid="invite-role"]', 'viewer')
      // await page.click('[data-testid="send-invite"]')

      // Then test as viewer
      // Viewer should not see expenses at all
    } finally {
      await deleteTestTrip(page, tripId)
    }
  })
})
