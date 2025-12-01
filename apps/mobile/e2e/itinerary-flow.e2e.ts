/**
 * E2E tests for Itinerary Management Flow
 *
 * NOTE: These tests should only run in CI/CD, not locally
 * Run with: npm run test:e2e:mobile
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox'

describe('Itinerary Management E2E Flow', () => {
  beforeAll(async () => {
    await device.launchApp()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  describe('Create Itinerary Item Flow', () => {
    it('should navigate to create itinerary screen from trip detail', async () => {
      // Assuming user is already logged in and on trip detail page
      // This would need proper setup with test data

      // Find and tap the "Add" button in itinerary section
      await waitFor(element(by.text('📋 Itinerary')))
        .toBeVisible()
        .withTimeout(5000)

      await element(by.text('+ Add')).tap()

      // Verify we're on the create screen
      await detoxExpect(element(by.text('Add Itinerary Item'))).toBeVisible()
    })

    it('should create a new itinerary item', async () => {
      // Navigate to create screen
      await element(by.text('+ Add')).tap()

      // Select type
      await element(by.text('🎯 Activity')).tap()

      // Fill in title
      await element(by.id('itinerary-title-input')).typeText('Visit Eiffel Tower')

      // Fill in location
      await element(by.id('itinerary-location-input')).typeText('Paris, France')

      // Fill in description
      await element(by.id('itinerary-description-input')).typeText(
        'Visit the iconic Eiffel Tower'
      )

      // Scroll to submit button if needed
      await element(by.id('itinerary-form-scroll')).scrollTo('bottom')

      // Submit form
      await element(by.text('✅ Add to Itinerary')).tap()

      // Verify success - should navigate back to trip detail
      await waitFor(element(by.text('Visit Eiffel Tower')))
        .toBeVisible()
        .withTimeout(3000)
    })

    it('should show validation errors for empty required fields', async () => {
      // Navigate to create screen
      await element(by.text('+ Add')).tap()

      // Try to submit without filling required fields
      await element(by.id('itinerary-form-scroll')).scrollTo('bottom')
      await element(by.text('✅ Add to Itinerary')).tap()

      // Should show validation errors
      await detoxExpect(element(by.text('Title is required'))).toBeVisible()
    })
  })

  describe('Edit Itinerary Item Flow', () => {
    it('should open itinerary item detail on tap', async () => {
      // Tap on an existing itinerary item
      await element(by.text('Visit Eiffel Tower')).tap()

      // Verify we're on detail screen
      await detoxExpect(element(by.text('✏️ Edit'))).toBeVisible()
      await detoxExpect(element(by.text('🗑️ Delete'))).toBeVisible()
    })

    it('should edit an itinerary item', async () => {
      // Open detail screen
      await element(by.text('Visit Eiffel Tower')).tap()

      // Tap edit button
      await element(by.text('✏️ Edit')).tap()

      // Edit title
      await element(by.id('itinerary-edit-title-input')).clearText()
      await element(by.id('itinerary-edit-title-input')).typeText('Eiffel Tower Visit')

      // Save changes
      await element(by.text('💾 Save')).tap()

      // Verify changes saved
      await waitFor(element(by.text('Eiffel Tower Visit')))
        .toBeVisible()
        .withTimeout(3000)
    })
  })

  describe('Delete Itinerary Item Flow', () => {
    it('should delete an itinerary item with confirmation', async () => {
      // Open detail screen
      await element(by.text('Eiffel Tower Visit')).tap()

      // Tap delete button
      await element(by.text('🗑️ Delete')).tap()

      // Confirm deletion in alert
      await element(by.text('Delete')).tap()

      // Verify item is deleted - should navigate back to trip detail
      await waitFor(element(by.text('Eiffel Tower Visit')))
        .not.toBeVisible()
        .withTimeout(3000)
    })
  })

  describe('Itinerary List Display', () => {
    it('should display itinerary items grouped by date', async () => {
      // Verify date grouping headers are visible
      await detoxExpect(element(by.text(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/))).toBeVisible()

      // Verify items show type icons
      await detoxExpect(element(by.text(/✈️|🏨|🍽️|🎯|🏛️|📌/))).toBeVisible()
    })

    it('should show time for non-all-day events', async () => {
      // Verify time display (format: "10:00 AM")
      await detoxExpect(element(by.text(/\d{1,2}:\d{2}\s(AM|PM)/))).toBeVisible()
    })

    it('should show location icon for items with location', async () => {
      await detoxExpect(element(by.text(/📍/))).toBeVisible()
    })
  })
})
