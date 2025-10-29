# E2E Testing Guide

## Overview

TripThreads implements comprehensive End-to-End (E2E) testing for authentication flows across web and mobile platforms. E2E tests validate complete user journeys from UI interaction through API calls to database persistence.

**Key Principle:** E2E tests should run in CI/CD environments only. They are flaky in local development due to timing issues, network conditions, and environment inconsistencies.

## Test Coverage

### Web E2E Tests (Playwright)

**Location:** `apps/web/tests/e2e/`

#### 1. Email Authentication (`email-auth.spec.ts`)

- **TC1.1**: Valid email signup creates user record
- **TC1.2**: Duplicate email shows appropriate error
- **TC1.3**: Invalid email format rejected
- **TC1.4**: Login with correct credentials succeeds
- **TC1.5**: Login with incorrect password fails
- **TC1.6**: Session token stored and persisted
- **TC1.7**: Password must be at least 6 characters

#### 2. OAuth Flows (`oauth.spec.ts`)

- **TC2.1**: Google OAuth redirects to provider
- **TC2.2**: Google callback creates/updates user profile
- **TC2.3**: OAuth callback without code redirects to login
- **TC2.4**: OAuth signup flow on signup page
- **TC2.5**: OAuth errors handled gracefully

#### 3. Session Management (`session-management.spec.ts`)

- **TC3.1**: Session persists after page reload
- **TC3.1b**: Session persists across multiple page navigations
- **TC3.1c**: Session persists across browser tabs
- **TC3.3**: Expired session redirects to login
- **TC3.4**: Logout clears session and redirects
- **TC3.5**: Unauthenticated access to protected routes redirects
- **TC3.6**: Auto token refresh maintains session

#### 4. Error Scenarios (`error-scenarios.spec.ts`)

- **TC4.1**: Network failure during auth shows retry/error
- **TC4.2**: Provider timeout handled gracefully
- **TC4.3**: Invalid OAuth state rejected
- **TC4.4**: Malformed callback URL handled
- **TC4.5**: API error responses shown to user
- **TC4.6**: Rate limiting handled gracefully
- **TC4.7**: Empty form submission prevented
- **TC4.8**: Concurrent login attempts handled

### Mobile E2E Tests (Detox)

**Location:** `apps/mobile/e2e/`

#### Auth E2E (`auth.e2e.ts`)

- **TC1.1M**: Email signup creates user
- **TC1.4M**: Login with correct credentials
- **TC1.5M**: Show error for incorrect password
- **TC3.2M**: Session persists after app relaunch
- **TC3.4M**: Logout clears session
- **TC2.1M**: Google OAuth button visible
- **TC4.7M**: Prevent empty form submission
- **TC4.1M**: Handle network errors gracefully

## Running Tests

### Web E2E Tests (Local - Not Recommended)

```bash
# Install Playwright browsers
cd apps/web
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test email-auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Mobile E2E Tests (Local - Not Recommended)

**Prerequisites:**

- iOS: Xcode and iOS Simulator
- Android: Android Studio and emulator

```bash
cd apps/mobile

# Build test apps
npm run build:e2e:ios
npm run build:e2e:android

# Run tests
npm run test:e2e:ios
npm run test:e2e:android
```

### Running in CI/CD (Recommended)

E2E tests run automatically in GitHub Actions on:

- Pull requests to `main` or `development`
- Direct pushes to `main` or `development`

**GitHub Actions Workflow:**

1. Checkout code
2. Install dependencies
3. Install Playwright browsers
4. Run Next.js dev server
5. Run Playwright tests
6. Upload test reports as artifacts

**View Results:**

- Go to Actions tab in GitHub
- Click on workflow run
- Download "playwright-report" artifact
- Open `index.html` in browser

## Test Architecture

### Playwright Configuration

**File:** `apps/web/playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Key Features:**

- Auto-starts Next.js dev server
- Tests run in parallel
- Automatic retries in CI
- Traces and screenshots on failure
- Multi-browser testing (Chrome, Firefox, Safari)

### Detox Configuration

**File:** `apps/mobile/.detoxrc.js`

```javascript
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      build: 'xcodebuild ...',
      binaryPath: 'ios/build/.../mobile.app',
    },
    'android.release': {
      type: 'android.apk',
      build: 'cd android && ./gradlew assembleRelease ...',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_API_34' },
    },
  },
}
```

## Writing E2E Tests

### Best Practices

1. **Use data-testid for selectors**

   ```typescript
   // ❌ Bad - fragile selector
   await page.click('button:has-text("Submit")')

   // ✅ Good - stable selector
   await page.click('[data-testid="submit-button"]')
   ```

2. **Wait for elements properly**

   ```typescript
   // ❌ Bad - arbitrary timeout
   await page.waitForTimeout(5000)

   // ✅ Good - wait for specific condition
   await expect(page.locator('[data-testid="user-email"]')).toBeVisible({ timeout: 10000 })
   ```

3. **Clean up between tests**

   ```typescript
   test.beforeEach(async ({ page }) => {
     await page.goto('/')
     await page.evaluate(() => {
       localStorage.clear()
       sessionStorage.clear()
     })
   })
   ```

4. **Generate unique test data**

   ```typescript
   const timestamp = Date.now()
   const testEmail = `test-${timestamp}@tripthreads.test`
   ```

5. **Mock external services**
   ```typescript
   // Mock OAuth provider to avoid external dependencies
   await page.route('**/auth/v1/**', async route => {
     await route.fulfill({
       status: 200,
       body: JSON.stringify({ access_token: 'mock-token' }),
     })
   })
   ```

### Test Structure

```typescript
import { test, expect } from '@playwright/test'

describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: clear state, navigate to starting point
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('TC1: Should do something', async ({ page }) => {
    // Arrange: set up test data
    const testEmail = `test-${Date.now()}@example.com`

    // Act: perform user actions
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.click('[data-testid="submit-button"]')

    // Assert: verify expected outcome
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('TC2: Should handle errors', async ({ page }) => {
    // Test error scenarios
  })
})
```

## Debugging Failed Tests

### Web Tests (Playwright)

1. **View HTML report**

   ```bash
   npx playwright show-report
   ```

2. **Run in headed mode**

   ```bash
   npx playwright test --headed
   ```

3. **Run with UI mode (interactive)**

   ```bash
   npm run test:e2e:ui
   ```

4. **Debug specific test**

   ```bash
   npx playwright test --debug email-auth.spec.ts
   ```

5. **View trace**
   - Open `playwright-report/index.html`
   - Click on failed test
   - View trace timeline with screenshots, network, console logs

### Mobile Tests (Detox)

1. **View test artifacts**

   ```bash
   open artifacts/
   ```

2. **Run with verbose logging**

   ```bash
   detox test --loglevel trace
   ```

3. **Record screen during test**
   ```bash
   detox test --record-videos all
   ```

## Common Issues and Solutions

### Issue: Test timeout

**Cause:** Element not appearing, network delay, app not loaded

**Solution:**

```typescript
// Increase timeout for specific assertion
await expect(page.locator('#element')).toBeVisible({ timeout: 30000 })

// Or in Playwright config
use: {
  timeout: 60000, // 60 seconds
}
```

### Issue: Flaky tests

**Cause:** Race conditions, timing issues, network instability

**Solution:**

- Use `waitFor` instead of `waitForTimeout`
- Implement automatic retries in CI
- Mock external services
- Ensure idempotent test setup

### Issue: "Element not found"

**Cause:** Selector changed, element not rendered, wrong timing

**Solution:**

```typescript
// Wait for element before interacting
await page.waitForSelector('[data-testid="element"]')
await page.click('[data-testid="element"]')

// Or use Playwright's auto-waiting
await page.click('[data-testid="element"]') // Waits automatically
```

### Issue: Test passes locally but fails in CI

**Cause:** Different environment, timing, resources

**Solution:**

- Run tests in headless mode locally
- Check CI logs for specific errors
- Ensure consistent environment variables
- Increase timeouts for CI environment

## Environment Variables

Tests require these environment variables:

**Web:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Mobile:**

```bash
# Set in app.json → extra
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**GitHub Secrets:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These are automatically injected in CI workflows.

## Test Data Management

### Strategy: Ephemeral test data

- Generate unique emails per test run
- Use timestamps for uniqueness
- Clean up after tests (optional)
- Don't rely on specific database state

### Example:

```typescript
// Generate unique test user
const timestamp = Date.now()
const testEmail = `e2e-${timestamp}@tripthreads.test`
const testPassword = 'TestPass123!'
const testName = `E2E User ${timestamp}`

// Use in tests
await signUp(testEmail, testPassword, testName)
```

### Database considerations:

- Tests create real data in Supabase
- Use test Supabase project for CI
- Periodically clean up old test data
- Consider using Supabase branches for isolation

## Continuous Improvement

### Metrics to track:

- Test execution time
- Flaky test rate
- Test coverage (code + user flows)
- CI pass rate

### Future enhancements:

- [ ] Visual regression testing (Percy, Chromatic)
- [ ] Lighthouse CI for performance
- [ ] Accessibility testing (axe-core)
- [ ] Load testing for critical flows
- [ ] Parallel test execution optimization
- [ ] Test data seeding automation
- [ ] Cross-device mobile testing (BrowserStack)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Supabase Testing Guide](https://supabase.com/docs/guides/platform/testing)

---

**Last Updated:** October 2025
**Status:** Complete
**Next Steps:** Run tests in CI/CD, monitor pass rates, iterate on flaky tests
