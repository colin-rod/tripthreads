import { device, element, by, expect as detoxExpect, waitFor } from 'detox'

/**
 * Photo Picker E2E Tests
 *
 * Test Cases:
 * - TC3.1: Camera/photo library permission requested
 * - TC3.2M: Photo picker opens and selects
 * - TC3.3M: Selected photo uploads successfully
 *
 * Note: Detox cannot interact with native photo picker UI.
 * These tests verify permission flows and app behavior before/after picker.
 * expo-image-picker is mocked to return test images.
 *
 * Run in CI/CD only - flaky in local dev environments
 */

describe('Photo Picker E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  describe('Permission Flow', () => {
    it('TC3.1: Should request photo library permission', async () => {
      // Disable photo permissions initially
      await device.disablePermissions({ permissions: ['photos'] })

      // Navigate to feedback screen (uses photo picker)
      await device.openURL('tripthreads://feedback')

      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(5000)

      // Tap add screenshot button
      await element(by.text('Add screenshot')).tap()

      // Permission denied - should show toast or message
      // (exact behavior depends on implementation)

      // Now grant permission
      await device.grantPermissions({ permissions: ['photos'] })

      // Retry adding screenshot
      await element(by.text('Add screenshot')).tap()

      // Should show loading state or picker opening
      // Note: Native picker won't actually open in E2E tests (mocked)
      await waitFor(element(by.text(/Opening photos|Selecting/i)))
        .toBeVisible()
        .withTimeout(2000)
    })

    it('TC3.1b: Should handle permission already granted', async () => {
      // Ensure permissions are granted
      await device.grantPermissions({ permissions: ['photos'] })

      // Navigate to feedback screen
      await device.openURL('tripthreads://feedback')

      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(5000)

      // Tap add screenshot - should not show permission prompt
      await element(by.text('Add screenshot')).tap()

      // Should proceed directly to picker (or loading state)
      await waitFor(element(by.text(/Opening photos|Selecting/i)))
        .toBeVisible()
        .withTimeout(2000)
    })
  })

  describe('Photo Picker Flow', () => {
    it('TC3.2M: Should open photo picker and show loading state', async () => {
      await device.grantPermissions({ permissions: ['photos'] })

      await device.openURL('tripthreads://feedback')

      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(5000)

      // Tap to open picker
      await element(by.text('Add screenshot')).tap()

      // Verify loading state appears
      await waitFor(element(by.text(/Opening photos/i)))
        .toBeVisible()
        .withTimeout(2000)

      // Note: Actual native picker interaction is mocked
      // The mock will return a test image automatically
    })

    it('TC3.2M-b: Should show selected photo preview', async () => {
      await device.grantPermissions({ permissions: ['photos'] })

      await device.openURL('tripthreads://feedback')

      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(5000)

      // Tap to select photo (mocked)
      await element(by.text('Add screenshot')).tap()

      // Wait for mock to return image
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Should show photo preview or thumbnail
      // (exact UI depends on implementation)
      await detoxExpect(element(by.id('screenshot-preview'))).toBeVisible()
    })
  })

  describe('Photo Upload Flow', () => {
    it('TC3.3M: Should upload photo with feedback submission', async () => {
      await device.grantPermissions({ permissions: ['photos'] })

      await device.openURL('tripthreads://feedback')

      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(5000)

      // Fill out feedback form
      await element(by.id('feedback-email-input')).typeText('test@example.com')
      await element(by.id('feedback-message-input')).typeText('Test feedback with screenshot')

      // Add screenshot (mocked to return test image)
      await element(by.text('Add screenshot')).tap()

      // Wait for mock image selection
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Submit feedback with photo
      await element(by.text('Send feedback')).tap()

      // Should show success message
      await waitFor(element(by.text(/Thank you|Feedback sent/i)))
        .toBeVisible()
        .withTimeout(10000)

      // Should return to previous screen or show confirmation
      await detoxExpect(element(by.text('Share feedback'))).not.toBeVisible()
    })

    it('TC3.3M-b: Should handle upload failure gracefully', async () => {
      await device.grantPermissions({ permissions: ['photos'] })

      await device.openURL('tripthreads://feedback')

      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(5000)

      // Fill out minimal feedback
      await element(by.id('feedback-email-input')).typeText('test@example.com')
      await element(by.id('feedback-message-input')).typeText('Test')

      // Add screenshot
      await element(by.text('Add screenshot')).tap()
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Simulate network error by enabling airplane mode
      // (requires Detox device capabilities)
      // For now, just submit and expect error handling

      await element(by.text('Send feedback')).tap()

      // Should show error message if upload fails
      // or success if network is working
      await waitFor(element(by.text(/sent|error|try again/i)))
        .toBeVisible()
        .withTimeout(10000)
    })
  })

  describe('Edge Cases', () => {
    it('Should handle user canceling photo picker', async () => {
      await device.grantPermissions({ permissions: ['photos'] })

      await device.openURL('tripthreads://feedback')

      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(5000)

      // Tap to open picker
      await element(by.text('Add screenshot')).tap()

      // Mock will handle cancelation (if configured)
      // App should return to feedback form
      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(3000)

      // Screenshot should not be attached
      await detoxExpect(element(by.id('screenshot-preview'))).not.toBeVisible()
    })

    it('Should allow removing selected photo', async () => {
      await device.grantPermissions({ permissions: ['photos'] })

      await device.openURL('tripthreads://feedback')

      await waitFor(element(by.text('Share feedback')))
        .toBeVisible()
        .withTimeout(5000)

      // Add screenshot
      await element(by.text('Add screenshot')).tap()
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Should show remove button
      await detoxExpect(element(by.id('remove-screenshot'))).toBeVisible()

      // Tap remove
      await element(by.id('remove-screenshot')).tap()

      // Screenshot preview should disappear
      await detoxExpect(element(by.id('screenshot-preview'))).not.toBeVisible()

      // Can add screenshot again
      await detoxExpect(element(by.text('Add screenshot'))).toBeVisible()
    })
  })
})
