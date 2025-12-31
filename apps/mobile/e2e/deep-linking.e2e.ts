import { device, element, by, expect as detoxExpect, waitFor } from 'detox'

/**
 * Deep Linking E2E Tests
 *
 * Test Cases:
 * - TC1.1: Invite link opens app and shows invite screen
 * - TC1.3: Trip link navigates to trip detail screen
 * - TC1.4: Deep link with auth required redirects to login
 *
 * Note: These tests require a running Expo development build
 * Run in CI/CD only - flaky in local dev environments
 */

describe('Deep Linking E2E', () => {
  const testInviteToken = 'test-invite-token-123'
  const testTripId = 'test-trip-deep-link'

  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  describe('Invite Links', () => {
    it('TC1.1: Should open invite screen from deep link (custom scheme)', async () => {
      // Open deep link with custom scheme
      await device.openURL({ url: `tripthreads://invite/${testInviteToken}` })

      // Should navigate to invite screen
      await waitFor(element(by.text('Trip Invitation')))
        .toBeVisible()
        .withTimeout(5000)

      // Should show invite details
      await detoxExpect(element(by.text(/invited to join/i))).toBeVisible()
      await detoxExpect(element(by.text('Accept Invitation'))).toBeVisible()
      await detoxExpect(element(by.text('Decline'))).toBeVisible()
    })

    it('TC1.1b: Should open invite screen from universal link', async () => {
      // Open deep link with universal link (https)
      await device.openURL({ url: `https://tripthreads.app/invite/${testInviteToken}` })

      // Should navigate to invite screen
      await waitFor(element(by.text('Trip Invitation')))
        .toBeVisible()
        .withTimeout(5000)

      // Should show invite details
      await detoxExpect(element(by.text(/invited to join/i))).toBeVisible()
      await detoxExpect(element(by.text('Accept Invitation'))).toBeVisible()
    })
  })

  describe('Trip Links', () => {
    it('TC1.3: Should navigate to trip detail from deep link', async () => {
      // Open trip deep link
      await device.openURL({ url: `tripthreads://trips/${testTripId}` })

      // Should navigate to trip detail screen
      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Should show trip dashboard sections
      await detoxExpect(element(by.text('📋 Itinerary'))).toBeVisible()
      await detoxExpect(element(by.text('💰 Expenses'))).toBeVisible()
      await detoxExpect(element(by.text('💬 Chat'))).toBeVisible()
    })

    it('TC1.3b: Should navigate to trip from universal link', async () => {
      // Open trip universal link
      await device.openURL({ url: `https://tripthreads.app/trips/${testTripId}` })

      // Should navigate to trip detail screen
      await waitFor(element(by.id('trip-detail-screen')))
        .toBeVisible()
        .withTimeout(5000)
    })
  })

  describe('Authentication Flow', () => {
    it('TC1.4: Should redirect to login when not authenticated', async () => {
      // Relaunch app in logged-out state
      await device.launchApp({
        newInstance: true,
        delete: true, // Clear app data to log out
      })

      // Try to open invite link while logged out
      await device.openURL({ url: `tripthreads://invite/${testInviteToken}` })

      // Should redirect to login screen
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Should show login form
      await detoxExpect(element(by.id('email-input'))).toBeVisible()
      await detoxExpect(element(by.id('password-input'))).toBeVisible()
      await detoxExpect(element(by.id('login-button'))).toBeVisible()
    })

    it('TC1.4b: Should redirect to login for trip link when not authenticated', async () => {
      // Ensure logged out state
      await device.launchApp({
        newInstance: true,
        delete: true,
      })

      // Try to open trip link while logged out
      await device.openURL({ url: `tripthreads://trips/${testTripId}` })

      // Should redirect to login screen
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(5000)
    })

    it('TC1.4c: Should navigate to target after login', async () => {
      // Assume logged out from previous test
      await device.openURL({ url: `tripthreads://invite/${testInviteToken}` })

      // Should be on login screen
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Login with test credentials
      await element(by.id('email-input')).typeText('test-mobile@tripthreads.test')
      await element(by.id('password-input')).typeText('TestPassword123!')
      await element(by.id('login-button')).tap()

      // Should navigate to invite screen after successful login
      await waitFor(element(by.text('Trip Invitation')))
        .toBeVisible()
        .withTimeout(10000)

      await detoxExpect(element(by.text('Accept Invitation'))).toBeVisible()
    })
  })

  describe('Edge Cases', () => {
    it('Should handle invalid invite token gracefully', async () => {
      await device.openURL({ url: 'tripthreads://invite/invalid-token-999' })

      // Should show error state or redirect to home
      await waitFor(element(by.text(/not found|expired|invalid/i)))
        .toBeVisible()
        .withTimeout(5000)
    })

    it('Should handle malformed deep links', async () => {
      await device.openURL({ url: 'tripthreads://invalid-path' })

      // Should redirect to home or show error
      // App should not crash
      await waitFor(element(by.id('trips-screen')))
        .toBeVisible()
        .withTimeout(5000)
    })
  })
})
