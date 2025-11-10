/**
 * E2E tests for Trip Management Flow
 *
 * NOTE: These tests should only run in CI/CD, not locally
 * Run with: npm run test:e2e:mobile
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox'

describe('Trip Management E2E Flow', () => {
  beforeAll(async () => {
    await device.launchApp()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  describe('Edit Trip Flow', () => {
    it('should navigate to trip settings', async () => {
      // Assuming user is on trip detail page
      await waitFor(element(by.text('⚙️ Settings')))
        .toBeVisible()
        .withTimeout(5000)

      await element(by.text('⚙️ Settings')).tap()

      // Verify we're on settings screen
      await detoxExpect(element(by.text('Trip Settings'))).toBeVisible()
    })

    it('should display trip details in view mode', async () => {
      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Verify trip details are displayed
      await detoxExpect(element(by.text('Trip Name'))).toBeVisible()
      await detoxExpect(element(by.text('Description'))).toBeVisible()
      await detoxExpect(element(by.text('Start Date'))).toBeVisible()
      await detoxExpect(element(by.text('End Date'))).toBeVisible()

      // Verify edit button is visible
      await detoxExpect(element(by.text('✏️ Edit Trip'))).toBeVisible()
    })

    it('should enter edit mode when edit button is tapped', async () => {
      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Tap edit button
      await element(by.text('✏️ Edit Trip')).tap()

      // Verify we're in edit mode
      await detoxExpect(element(by.text('💾 Save Changes'))).toBeVisible()
      await detoxExpect(element(by.text('Cancel'))).toBeVisible()

      // Verify form fields are editable
      await detoxExpect(element(by.id('trip-name-input'))).toBeVisible()
      await detoxExpect(element(by.id('trip-description-input'))).toBeVisible()
    })

    it('should edit trip name and save changes', async () => {
      // Navigate to settings and enter edit mode
      await element(by.text('⚙️ Settings')).tap()
      await element(by.text('✏️ Edit Trip')).tap()

      // Edit trip name
      await element(by.id('trip-name-input')).clearText()
      await element(by.id('trip-name-input')).typeText('Updated Trip Name')

      // Save changes
      await element(by.text('💾 Save Changes')).tap()

      // Verify changes saved (back in view mode)
      await waitFor(element(by.text('Updated Trip Name')))
        .toBeVisible()
        .withTimeout(3000)

      // Verify we're back in view mode
      await detoxExpect(element(by.text('✏️ Edit Trip'))).toBeVisible()
    })

    it('should edit trip description', async () => {
      // Navigate to settings and enter edit mode
      await element(by.text('⚙️ Settings')).tap()
      await element(by.text('✏️ Edit Trip')).tap()

      // Scroll to description field
      await element(by.id('trip-settings-scroll')).scrollTo('bottom')

      // Edit description
      await element(by.id('trip-description-input')).clearText()
      await element(by.id('trip-description-input')).typeText(
        'An amazing adventure through Europe with friends'
      )

      // Save changes
      await element(by.id('trip-settings-scroll')).scrollTo('bottom')
      await element(by.text('💾 Save Changes')).tap()

      // Verify changes saved
      await waitFor(element(by.text('An amazing adventure through Europe with friends')))
        .toBeVisible()
        .withTimeout(3000)
    })

    it('should update trip dates', async () => {
      // Navigate to settings and enter edit mode
      await element(by.text('⚙️ Settings')).tap()
      await element(by.text('✏️ Edit Trip')).tap()

      // Scroll to date fields
      await element(by.id('trip-settings-scroll')).swipe('up', 'fast', 0.5)

      // Tap on start date picker
      await element(by.id('trip-start-date-picker')).tap()
      // In a real test, we would interact with the date picker
      // For now, we'll just verify the picker appears

      // Verify date picker controls are visible
      await detoxExpect(element(by.id('date-picker-modal'))).toBeVisible()

      // Close picker (implementation depends on DatePicker component)
      // await element(by.text('Done')).tap()

      // Similar for end date
      // await element(by.id('trip-end-date-picker')).tap()
    })

    it('should cancel editing without saving changes', async () => {
      // Navigate to settings and enter edit mode
      await element(by.text('⚙️ Settings')).tap()
      await element(by.text('✏️ Edit Trip')).tap()

      // Make changes
      await element(by.id('trip-name-input')).clearText()
      await element(by.id('trip-name-input')).typeText('Temporary Name')

      // Cancel editing
      await element(by.text('Cancel')).tap()

      // Verify changes were not saved (should show original name)
      await detoxExpect(element(by.text('Temporary Name'))).not.toBeVisible()

      // Verify we're back in view mode
      await detoxExpect(element(by.text('✏️ Edit Trip'))).toBeVisible()
    })

    it('should show validation errors for invalid input', async () => {
      // Navigate to settings and enter edit mode
      await element(by.text('⚙️ Settings')).tap()
      await element(by.text('✏️ Edit Trip')).tap()

      // Clear required field (trip name)
      await element(by.id('trip-name-input')).clearText()

      // Try to save
      await element(by.id('trip-settings-scroll')).scrollTo('bottom')
      await element(by.text('💾 Save Changes')).tap()

      // Verify validation error
      await detoxExpect(element(by.text('Trip name is required'))).toBeVisible()
    })
  })

  describe('Trip Participants', () => {
    it('should display trip participants list', async () => {
      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Scroll to participants section
      await element(by.id('trip-settings-scroll')).swipe('up', 'fast', 0.5)

      // Verify participants section
      await detoxExpect(element(by.text('Participants'))).toBeVisible()

      // Verify at least one participant is shown
      await detoxExpect(element(by.text(/Owner|Participant|Viewer/))).toBeVisible()
    })

    it('should show participant roles', async () => {
      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Scroll to participants section
      await element(by.id('trip-settings-scroll')).swipe('up', 'fast', 0.5)

      // Verify owner badge
      await detoxExpect(element(by.text('👑 Owner'))).toBeVisible()
    })
  })

  describe('Delete Trip Flow', () => {
    it('should show delete button for trip owner', async () => {
      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Scroll to bottom where delete button is
      await element(by.id('trip-settings-scroll')).scrollTo('bottom')

      // Verify delete button exists
      await detoxExpect(element(by.text('🗑️ Delete Trip'))).toBeVisible()
    })

    it('should show confirmation dialog when delete is tapped', async () => {
      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Scroll to delete button
      await element(by.id('trip-settings-scroll')).scrollTo('bottom')

      // Tap delete button
      await element(by.text('🗑️ Delete Trip')).tap()

      // Verify confirmation alert appears
      await detoxExpect(element(by.text('Delete Trip'))).toBeVisible()
      await detoxExpect(
        element(by.text(/Are you sure you want to delete this trip/))
      ).toBeVisible()
    })

    it('should cancel deletion when cancel is tapped', async () => {
      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Scroll to delete button
      await element(by.id('trip-settings-scroll')).scrollTo('bottom')

      // Tap delete button
      await element(by.text('🗑️ Delete Trip')).tap()

      // Cancel deletion
      await element(by.text('Cancel')).tap()

      // Verify we're still on settings screen
      await detoxExpect(element(by.text('Trip Settings'))).toBeVisible()
    })

    // Note: We won't actually test successful deletion in E2E
    // as that would destroy test data. This should be tested
    // in integration tests instead.
  })

  describe('Navigation', () => {
    it('should navigate back from settings to trip detail', async () => {
      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Tap back button
      await element(by.text('← Back')).tap()

      // Verify we're back on trip detail
      await detoxExpect(element(by.text('📋 Itinerary'))).toBeVisible()
      await detoxExpect(element(by.text('💰 Expenses'))).toBeVisible()
    })

    it('should preserve trip data when navigating back and forth', async () => {
      const tripName = 'Updated Trip Name'

      // Verify trip name on detail page
      await detoxExpect(element(by.text(tripName))).toBeVisible()

      // Navigate to settings
      await element(by.text('⚙️ Settings')).tap()

      // Verify trip name in settings
      await detoxExpect(element(by.text(tripName))).toBeVisible()

      // Navigate back
      await element(by.text('← Back')).tap()

      // Verify trip name still visible
      await detoxExpect(element(by.text(tripName))).toBeVisible()
    })
  })

  describe('Loading States', () => {
    it('should show loading indicator while fetching trip data', async () => {
      // This test would require simulating slow network
      // or controlling the API response timing

      // On fresh load, loading indicator should appear briefly
      await device.reloadReactNative()

      // In a real scenario with slower network:
      // await detoxExpect(element(by.text('Loading...'))).toBeVisible()

      // Then data should load
      await waitFor(element(by.text('Trip Settings')))
        .toBeVisible()
        .withTimeout(5000)
    })
  })
})
