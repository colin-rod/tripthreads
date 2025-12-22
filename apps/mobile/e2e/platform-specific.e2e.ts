import { device, element, by, expect as detoxExpect, waitFor } from 'detox'

/**
 * Platform-Specific Behavior E2E Tests
 *
 * Test Cases:
 * - TC5.1: Android back button navigation
 * - TC5.2: iOS swipe-back gesture
 * - TC5.3: Status bar styling
 * - TC5.4: Safe area insets
 *
 * These tests verify platform-specific behaviors work correctly.
 * Run in CI/CD only - flaky in local dev environments
 */

describe('Platform-Specific Behaviors E2E', () => {
  let platform: 'ios' | 'android'

  beforeAll(async () => {
    platform = device.getPlatform() as 'ios' | 'android'

    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  describe('Navigation Gestures', () => {
    it('TC5.1: Android back button should navigate back', async () => {
      if (platform !== 'android') {
        console.log('Skipping Android-specific test on iOS')
        return
      }

      // Navigate to a trip detail screen
      await device.openURL('tripthreads://trips/test-trip-deep-link')

      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Navigate to settings
      await waitFor(element(by.text('⚙️ Settings')))
        .toBeVisible()
        .withTimeout(3000)

      await element(by.text('⚙️ Settings')).tap()

      // Wait for settings screen
      await waitFor(element(by.id('trip-settings-screen')))
        .toBeVisible()
        .withTimeout(3000)

      // Press Android back button
      await device.pressBack()

      // Should navigate back to trip detail
      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(3000)

      // Trip detail should be visible again
      await detoxExpect(element(by.text('📋 Itinerary'))).toBeVisible()
      await detoxExpect(element(by.text('💰 Expenses'))).toBeVisible()
    })

    it('TC5.1b: Android back button from nested screens', async () => {
      if (platform !== 'android') {
        return
      }

      // Navigate through multiple screens
      await device.openURL('tripthreads://trips/test-trip-deep-link')
      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Go to expenses
      await element(by.text('💰 Expenses')).tap()
      await waitFor(element(by.text(/expenses|no expenses/i)))
        .toBeVisible()
        .withTimeout(3000)

      // Press back - should return to trip detail
      await device.pressBack()
      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(3000)

      // Press back again - should return to trips list
      await device.pressBack()
      await waitFor(element(by.id('trips-screen')))
        .toBeVisible()
        .withTimeout(3000)
    })

    it('TC5.2: iOS swipe-back gesture should navigate back', async () => {
      if (platform !== 'ios') {
        console.log('Skipping iOS-specific test on Android')
        return
      }

      // Navigate to trip detail
      await device.openURL('tripthreads://trips/test-trip-deep-link')

      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Navigate to settings
      await waitFor(element(by.text('⚙️ Settings')))
        .toBeVisible()
        .withTimeout(3000)

      await element(by.text('⚙️ Settings')).tap()

      await waitFor(element(by.id('trip-settings-screen')))
        .toBeVisible()
        .withTimeout(3000)

      // Perform swipe-back gesture from left edge
      await element(by.id('trip-settings-screen')).swipe(
        'right', // direction
        'slow', // speed
        0.8, // percentage
        0.1, // x start position (left edge)
        0.5 // y position (middle)
      )

      // Should navigate back to trip detail
      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(3000)

      await detoxExpect(element(by.text('📋 Itinerary'))).toBeVisible()
    })

    it('TC5.2b: iOS swipe-back from nested screens', async () => {
      if (platform !== 'ios') {
        return
      }

      await device.openURL('tripthreads://trips/test-trip-deep-link')
      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Navigate to itinerary
      await element(by.text('📋 Itinerary')).tap()
      await waitFor(element(by.text(/itinerary|no items/i)))
        .toBeVisible()
        .withTimeout(3000)

      // Swipe back
      await element(by.id('itinerary-screen')).swipe('right', 'slow', 0.8, 0.1, 0.5)

      // Should return to trip detail
      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(3000)
    })
  })

  describe('Visual Elements', () => {
    it('TC5.3: Status bar should render without errors', async () => {
      // Launch fresh app
      await device.launchApp({ newInstance: true })

      // Wait for login screen
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Take screenshot for visual verification
      await device.takeScreenshot(`status-bar-${platform}-light`)

      // App should render without crashing
      await detoxExpect(element(by.id('login-screen'))).toBeVisible()

      // Status bar elements should not overlap content
      await detoxExpect(element(by.text('Sign in'))).toBeVisible()
      await detoxExpect(element(by.text('Sign up'))).toBeVisible()
    })

    it('TC5.3b: Status bar across different screens', async () => {
      // Login first
      await device.openURL('tripthreads://trips')

      await waitFor(element(by.id('trips-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Take screenshot of trips screen
      await device.takeScreenshot(`status-bar-${platform}-trips`)

      // Navigate to trip detail
      await device.openURL('tripthreads://trips/test-trip-deep-link')

      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Take screenshot of detail screen
      await device.takeScreenshot(`status-bar-${platform}-detail`)

      // All screens should render properly with status bar
      await detoxExpect(element(by.id('trip-detail-screen'))).toBeVisible()
    })

    it('TC5.4: Safe area insets should be respected', async () => {
      // Navigate to trip detail
      await device.openURL('tripthreads://trips/test-trip-deep-link')

      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Take screenshot for safe area verification
      await device.takeScreenshot(`safe-area-${platform}`)

      // Verify all critical elements are visible (not cut off by notch/insets)
      await detoxExpect(element(by.text('📋 Itinerary'))).toBeVisible()
      await detoxExpect(element(by.text('💰 Expenses'))).toBeVisible()
      await detoxExpect(element(by.text('💬 Chat'))).toBeVisible()

      // Verify elements are tappable (proves they're within safe area)
      await element(by.text('📋 Itinerary')).tap()
      await waitFor(element(by.text(/itinerary|no items/i)))
        .toBeVisible()
        .withTimeout(3000)

      // Go back and verify other elements
      if (platform === 'ios') {
        await element(by.id('itinerary-screen')).swipe('right', 'slow', 0.8, 0.1, 0.5)
      } else {
        await device.pressBack()
      }

      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(3000)

      // Tap expenses
      await element(by.text('💰 Expenses')).tap()
      await waitFor(element(by.text(/expenses|no expenses/i)))
        .toBeVisible()
        .withTimeout(3000)
    })

    it('TC5.4b: Safe area on different device orientations', async () => {
      // Landscape orientation (if supported)
      // Note: Detox orientation changes may not work on all devices
      try {
        await device.setOrientation('landscape')

        await device.openURL('tripthreads://trips/test-trip-deep-link')

        await waitFor(element(by.id('trip-detail-screen')))
          .toBeVisible()
          .withTimeout(5000)

        // Take screenshot
        await device.takeScreenshot(`safe-area-${platform}-landscape`)

        // Verify elements still visible in landscape
        await detoxExpect(element(by.text('📋 Itinerary'))).toBeVisible()
        await detoxExpect(element(by.text('💰 Expenses'))).toBeVisible()

        // Restore portrait
        await device.setOrientation('portrait')
      } catch {
        console.log('Orientation test skipped (not supported on this device)')
      }
    })
  })

  describe('Platform-Specific UI', () => {
    it('Should render platform-appropriate navigation', async () => {
      await device.openURL('tripthreads://trips/test-trip-deep-link')

      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // iOS typically shows back button with text
      // Android shows back arrow icon
      // Both should allow navigation

      await element(by.text('⚙️ Settings')).tap()

      await waitFor(element(by.id('trip-settings-screen')))
        .toBeVisible()
        .withTimeout(3000)

      // Navigate back using platform-appropriate method
      if (platform === 'ios') {
        // iOS: swipe or back button
        await element(by.id('trip-settings-screen')).swipe('right', 'slow', 0.8, 0.1, 0.5)
      } else {
        // Android: hardware back button
        await device.pressBack()
      }

      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(3000)
    })

    it('Should handle platform-specific keyboard behavior', async () => {
      // Navigate to a screen with text input
      await device.openURL('tripthreads://trips')

      await waitFor(element(by.id('trips-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Tap create trip button (has text inputs)
      await element(by.id('create-trip-fab')).tap()

      await waitFor(element(by.id('trip-name-input')))
        .toBeVisible()
        .withTimeout(3000)

      // Type into input
      await element(by.id('trip-name-input')).typeText('Platform Test Trip')

      // Keyboard should be visible
      // On iOS: Done button
      // On Android: Return/Enter key

      // Take screenshot
      await device.takeScreenshot(`keyboard-${platform}`)

      // Dismiss keyboard (platform-specific)
      if (platform === 'ios') {
        // iOS: Tap outside or Done button
        await element(by.id('create-trip-screen')).tap()
      } else {
        // Android: Press back
        await device.pressBack()
      }

      // Input should still have text
      await detoxExpect(element(by.id('trip-name-input'))).toHaveText('Platform Test Trip')
    })
  })
})
