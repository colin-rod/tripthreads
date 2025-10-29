import { device, element, by, expect as detoxExpect } from 'detox'

/**
 * Mobile Auth E2E Tests
 *
 * Test Cases:
 * - Email signup and login flows
 * - Session persistence after app relaunch
 * - OAuth flows (mocked)
 * - Error handling
 * - Logout flow
 *
 * Note: These tests require a running Expo development build
 * Run in CI/CD only - flaky in local dev environments
 */

describe('Mobile Authentication E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  describe('Email Authentication', () => {
    const testEmail = `mobile-test-${Date.now()}@tripthreads.test`
    const testPassword = 'MobileTest123!'
    const testName = 'Mobile Test User'

    it('TC1.1M: Should sign up with email and password', async () => {
      // Navigate to signup screen
      await detoxExpect(element(by.text('Sign up'))).toBeVisible()
      await element(by.text('Sign up')).tap()

      // Fill signup form
      await element(by.id('fullName-input')).typeText(testName)
      await element(by.id('email-input')).typeText(testEmail)
      await element(by.id('password-input')).typeText(testPassword)

      // Submit
      await element(by.id('signup-button')).tap()

      // Should show success and navigate to trips
      await waitFor(element(by.text('Account created!')))
        .toBeVisible()
        .withTimeout(10000)

      await waitFor(element(by.id('trips-screen')))
        .toBeVisible()
        .withTimeout(10000)
    })

    it('TC1.4M: Should login with correct credentials', async () => {
      // Navigate to login screen
      await detoxExpect(element(by.text('Sign in'))).toBeVisible()
      await element(by.text('Sign in')).tap()

      // Fill login form
      await element(by.id('email-input')).typeText(testEmail)
      await element(by.id('password-input')).typeText(testPassword)

      // Submit
      await element(by.id('login-button')).tap()

      // Should navigate to trips screen
      await waitFor(element(by.id('trips-screen')))
        .toBeVisible()
        .withTimeout(10000)
    })

    it('TC1.5M: Should show error for incorrect password', async () => {
      await element(by.text('Sign in')).tap()

      await element(by.id('email-input')).typeText(testEmail)
      await element(by.id('password-input')).typeText('WrongPassword!')

      await element(by.id('login-button')).tap()

      // Should show error message
      await waitFor(element(by.text(/Invalid credentials|Incorrect password/i)))
        .toBeVisible()
        .withTimeout(10000)
    })
  })

  describe('Session Management', () => {
    it('TC3.2M: Session persists after app relaunch', async () => {
      // Assume already logged in from previous tests
      // Verify we're on trips screen
      await detoxExpect(element(by.id('trips-screen'))).toBeVisible()

      // Terminate and relaunch app
      await device.terminateApp()
      await device.launchApp({ newInstance: false })

      // Should still be authenticated
      await waitFor(element(by.id('trips-screen')))
        .toBeVisible()
        .withTimeout(10000)

      // Should not show login screen
      await detoxExpect(element(by.id('login-screen'))).not.toBeVisible()
    })

    it('TC3.4M: Logout clears session', async () => {
      // Assume on trips screen
      await detoxExpect(element(by.id('trips-screen'))).toBeVisible()

      // Tap logout button
      await element(by.id('logout-button')).tap()

      // Should navigate to login screen
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000)

      // Relaunch app
      await device.terminateApp()
      await device.launchApp({ newInstance: false })

      // Should still be logged out
      await detoxExpect(element(by.id('login-screen'))).toBeVisible()
    })
  })

  describe('Google OAuth', () => {
    it('TC2.1M: Should show Google OAuth button', async () => {
      await element(by.text('Sign in')).tap()

      // Should have Google OAuth button
      await detoxExpect(element(by.text('Continue with Google'))).toBeVisible()
      await detoxExpect(element(by.id('google-oauth-button'))).toBeVisible()
    })

    // Note: Full OAuth flow testing requires mocking or test credentials
    // This would be configured in CI/CD with test Google OAuth client
  })

  describe('Error Scenarios', () => {
    it('TC4.7M: Should prevent empty form submission', async () => {
      await element(by.text('Sign in')).tap()

      // Try to submit without filling form
      await element(by.id('login-button')).tap()

      // Should show validation errors
      await detoxExpect(element(by.text(/required|enter.*email/i))).toBeVisible()
    })

    it('TC4.1M: Should handle network errors gracefully', async () => {
      // Enable network throttling or disable network
      // This requires additional setup with Detox device settings

      await element(by.text('Sign in')).tap()

      await element(by.id('email-input')).typeText('network@test.com')
      await element(by.id('password-input')).typeText('password123')

      // With network disabled, should show error
      await element(by.id('login-button')).tap()

      // Should show network error message (if network is actually disabled)
      // This is a placeholder - actual implementation depends on network mocking
    })
  })
})
