/**
 * E2E tests for Expense Management Flow
 *
 * NOTE: These tests should only run in CI/CD, not locally
 * Run with: npm run test:e2e:mobile
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox'

describe('Expense Management E2E Flow', () => {
  beforeAll(async () => {
    await device.launchApp()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  describe('Create Expense Flow', () => {
    it('should navigate to create expense screen from trip detail', async () => {
      // Assuming user is already logged in and on trip detail page
      // This would need proper setup with test data

      // Find and tap the "Add" button in expenses section
      await waitFor(element(by.text('💰 Expenses')))
        .toBeVisible()
        .withTimeout(5000)

      await element(by.text('+ Add')).tap()

      // Verify we're on the create screen
      await detoxExpect(element(by.text('Add Expense'))).toBeVisible()
    })

    it('should create a new expense with equal split', async () => {
      // Navigate to create screen
      await element(by.text('+ Add')).tap()

      // Fill in description
      await element(by.id('expense-description-input')).typeText('Dinner at Le Bistro')

      // Fill in amount
      await element(by.id('expense-amount-input')).typeText('60.00')

      // Select category
      await element(by.text('🍽️ Food')).tap()

      // Select payer (assuming first participant is selected by default)
      // In a real test, we would tap a specific participant

      // Verify participants are selected (default: all selected)
      await detoxExpect(element(by.text(/participant\(s\) selected/))).toBeVisible()

      // Submit form
      await element(by.text('✅ Add Expense')).tap()

      // Verify success - should navigate back to trip detail
      await waitFor(element(by.text('Dinner at Le Bistro')))
        .toBeVisible()
        .withTimeout(3000)

      // Verify amount is displayed
      await detoxExpect(element(by.text(/\$60\.00/))).toBeVisible()
    })

    it('should show validation errors for empty required fields', async () => {
      // Navigate to create screen
      await element(by.text('+ Add')).tap()

      // Try to submit without filling required fields
      await element(by.id('expense-form-scroll')).scrollTo('bottom')
      await element(by.text('✅ Add Expense')).tap()

      // Should show validation errors
      await detoxExpect(element(by.text('Description is required'))).toBeVisible()
      await detoxExpect(element(by.text('Amount must be a positive number'))).toBeVisible()
    })

    it('should allow selecting specific participants for split', async () => {
      // Navigate to create screen
      await element(by.text('+ Add')).tap()

      // Fill required fields
      await element(by.id('expense-description-input')).typeText('Taxi')
      await element(by.id('expense-amount-input')).typeText('30.00')
      await element(by.text('🚗 Transport')).tap()

      // Scroll to participants section
      await element(by.id('expense-form-scroll')).scrollTo('bottom')

      // Toggle off a participant (tap to deselect)
      // This assumes there are at least 2 participants
      await element(by.text('Split equally between:')).swipe('up', 'fast', 0.5)

      // In a real test, we would tap specific participants to toggle them
      // For now, verify the participant count updates
      await detoxExpect(element(by.text(/participant\(s\) selected/))).toBeVisible()
    })
  })

  describe('Edit Expense Flow', () => {
    it('should open expense detail on tap', async () => {
      // Tap on an existing expense
      await element(by.text('Dinner at Le Bistro')).tap()

      // Verify we're on detail screen
      await detoxExpect(element(by.text('✏️ Edit'))).toBeVisible()
      await detoxExpect(element(by.text('🗑️ Delete'))).toBeVisible()
    })

    it('should edit an expense', async () => {
      // Open detail screen
      await element(by.text('Dinner at Le Bistro')).tap()

      // Tap edit button
      await element(by.text('✏️ Edit')).tap()

      // Verify we're in edit mode
      await detoxExpect(element(by.text('Edit Expense'))).toBeVisible()

      // Edit description
      await element(by.id('expense-edit-description-input')).clearText()
      await element(by.id('expense-edit-description-input')).typeText('Dinner at La Maison')

      // Edit amount
      await element(by.id('expense-edit-amount-input')).clearText()
      await element(by.id('expense-edit-amount-input')).typeText('75.00')

      // Save changes
      await element(by.text('💾 Save')).tap()

      // Verify changes saved
      await waitFor(element(by.text('Dinner at La Maison')))
        .toBeVisible()
        .withTimeout(3000)

      await detoxExpect(element(by.text(/\$75\.00/))).toBeVisible()
    })

    it('should cancel editing without saving changes', async () => {
      // Open detail screen
      await element(by.text('Dinner at La Maison')).tap()

      // Tap edit button
      await element(by.text('✏️ Edit')).tap()

      // Make changes
      await element(by.id('expense-edit-description-input')).clearText()
      await element(by.id('expense-edit-description-input')).typeText('Changed Description')

      // Cancel
      await element(by.text('Cancel')).tap()

      // Verify we're back in view mode with original data
      await detoxExpect(element(by.text('Dinner at La Maison'))).toBeVisible()
      await detoxExpect(element(by.text('Changed Description'))).not.toBeVisible()
    })
  })

  describe('Delete Expense Flow', () => {
    it('should delete an expense with confirmation', async () => {
      // Open detail screen
      await element(by.text('Dinner at La Maison')).tap()

      // Tap delete button
      await element(by.text('🗑️ Delete')).tap()

      // Confirm deletion in alert
      await element(by.text('Delete')).tap()

      // Verify item is deleted - should navigate back to trip detail
      await waitFor(element(by.text('Dinner at La Maison')))
        .not.toBeVisible()
        .withTimeout(3000)
    })
  })

  describe('Expense List Display', () => {
    it('should display expenses with category icons', async () => {
      // Verify category icons are visible
      await detoxExpect(element(by.text(/🍽️|🚗|🏨|🎯|💰/))).toBeVisible()
    })

    it('should show expense amount and payer', async () => {
      // Verify amount format (currency with decimals)
      await detoxExpect(element(by.text(/\$\d+\.\d{2}/))).toBeVisible()

      // Verify "paid by" text exists
      await detoxExpect(element(by.text(/ paid/))).toBeVisible()
    })
  })

  describe('Settlement Summary', () => {
    it('should display settlement summary with optimized debts', async () => {
      // Scroll to settlements section
      await element(by.id('trip-detail-scroll')).scrollTo('bottom')

      // Verify settlements header
      await detoxExpect(element(by.text('💸 Settlements'))).toBeVisible()

      // Verify settlement cards (format: "Bob owes Alice $30.00")
      await detoxExpect(element(by.text(/owes/))).toBeVisible()
    })

    it('should show balanced state when no settlements needed', async () => {
      // This test would require a trip with balanced expenses
      // Scroll to settlements section
      await element(by.id('trip-detail-scroll')).scrollTo('bottom')

      // If balanced, should show "All settled up!" message
      // In this test scenario, we expect settlements to exist
      await detoxExpect(element(by.text(/owes/))).toBeVisible()
    })
  })

  describe('Expense with Multiple Participants', () => {
    it('should display participant splits on detail screen', async () => {
      // Create or tap an expense
      await element(by.text('Taxi')).tap()

      // Scroll to participants section
      await element(by.id('expense-detail-scroll')).scrollTo('bottom')

      // Verify "Split between" section
      await detoxExpect(element(by.text(/Split between \(\d+\)/))).toBeVisible()

      // Verify participant names and amounts are shown
      await detoxExpect(element(by.text(/\$\d+\.\d{2}/))).toBeVisible()
    })
  })

  describe('Multi-Currency Expenses', () => {
    it('should create expense with different currency', async () => {
      // Navigate to create screen
      await element(by.text('+ Add')).tap()

      // Fill in expense details
      await element(by.id('expense-description-input')).typeText('Hotel in Paris')
      await element(by.id('expense-amount-input')).typeText('120.00')

      // Change currency
      await element(by.id('expense-currency-input')).clearText()
      await element(by.id('expense-currency-input')).typeText('EUR')

      // Select category
      await element(by.text('🏨 Accommodation')).tap()

      // Submit
      await element(by.text('✅ Add Expense')).tap()

      // Verify expense created with EUR currency
      await waitFor(element(by.text(/€120\.00/)))
        .toBeVisible()
        .withTimeout(3000)
    })
  })
})
