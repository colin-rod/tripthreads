# Deep Linking Testing Guide

This guide explains how to test deep linking functionality in the TripThreads mobile app.

## Overview

Deep linking allows users to open the TripThreads app directly from:

- **Invite links**: `https://tripthreads.app/invite/TOKEN`
- **Trip links**: `https://tripthreads.app/trips/ID`
- **Custom scheme**: `tripthreads://invite/TOKEN` or `tripthreads://trips/ID`

## Implementation Summary

### Files Created/Modified

1. **App Configuration** ([app.json](./app.json:16-57))
   - iOS: `associatedDomains` for universal links
   - Android: `intentFilters` for app links
   - Custom URL scheme: `tripthreads://`

2. **Deep Link Parser** ([lib/linking/deep-link-parser.ts](./lib/linking/deep-link-parser.ts))
   - Parses invite and trip deep links
   - Handles both universal links and custom scheme
   - Extracts tokens, trip IDs, and redirect paths

3. **Deep Link Hook** ([lib/linking/use-deep-link.ts](./lib/linking/use-deep-link.ts))
   - Handles initial deep links on app launch
   - Listens for deep links while app is running
   - Redirects to login if user is not authenticated
   - Navigates to appropriate screen when authenticated

4. **Root Layout** ([app/\_layout.tsx](./app/_layout.tsx))
   - Wraps app in `AuthProvider`
   - Initializes deep link handling with `useDeepLink()` hook

5. **Route Screens**
   - [app/(auth)/login.tsx](<./app/(auth)/login.tsx>) - Login with redirect support
   - [app/(auth)/signup.tsx](<./app/(auth)/signup.tsx>) - Signup with redirect support
   - [app/(app)/invite/[token].tsx](<./app/(app)/invite/[token].tsx>) - Invite acceptance screen
   - [app/(app)/trips/[id].tsx](<./app/(app)/trips/[id].tsx>) - Trip detail screen
   - [app/(app)/trips/index.tsx](<./app/(app)/trips/index.tsx>) - Trips list screen

## Testing Approaches

### 1. Local Development Testing (iOS Simulator)

**Test Custom Scheme Links:**

```bash
# From terminal (while simulator is running)
xcrun simctl openurl booted "tripthreads://invite/abc123"
xcrun simctl openurl booted "tripthreads://trips/xyz789"
```

**Test Universal Links:**

```bash
# Universal links (requires app to be installed)
xcrun simctl openurl booted "https://tripthreads.app/invite/abc123"
xcrun simctl openurl booted "https://tripthreads.app/trips/xyz789"
```

**Safari Testing:**

1. Open Safari in iOS Simulator
2. Navigate to `https://tripthreads.app/invite/abc123`
3. App should open automatically (if universal links are configured)

### 2. Local Development Testing (Android Emulator)

**Test Custom Scheme Links:**

```bash
# From terminal (while emulator is running)
adb shell am start -W -a android.intent.action.VIEW -d "tripthreads://invite/abc123" com.tripthreads.app
adb shell am start -W -a android.intent.action.VIEW -d "tripthreads://trips/xyz789" com.tripthreads.app
```

**Test Universal Links:**

```bash
# Universal links
adb shell am start -W -a android.intent.action.VIEW -d "https://tripthreads.app/invite/abc123" com.tripthreads.app
adb shell am start -W -a android.intent.action.VIEW -d "https://tripthreads.app/trips/xyz789" com.tripthreads.app
```

**Chrome Testing:**

1. Open Chrome in Android Emulator
2. Navigate to `https://tripthreads.app/invite/abc123`
3. App should open automatically (if app links are verified)

### 3. Physical Device Testing (Recommended)

**iOS (TestFlight):**

1. Install app via TestFlight
2. Send test link via Messages/Email/Slack
3. Tap link to open app
4. Verify:
   - Universal links open app directly
   - Deep link navigation works
   - Auth redirect works for unauthenticated users

**Android (Internal Testing):**

1. Install app via Google Play Internal Testing
2. Send test link via Messages/Email/Slack
3. Tap link to open app
4. Verify:
   - App links open app directly
   - Deep link navigation works
   - Auth redirect works for unauthenticated users

### 4. EAS Build Testing

**Build and Install:**

```bash
# iOS (Internal Distribution)
eas build --profile development --platform ios
# Install via EAS CLI or download from build page

# Android (APK)
eas build --profile development --platform android
# Install APK on device via adb or download
```

**Verify Configuration:**

```bash
# Check if deep linking is configured
eas config

# View build details
eas build:list
```

## Test Scenarios

### Scenario 1: Unauthenticated User Clicks Invite Link

**Steps:**

1. User is not logged in
2. Click invite link: `https://tripthreads.app/invite/abc123`
3. App opens

**Expected Behavior:**

- App redirects to login screen
- Login screen shows message: "Please log in to continue"
- After login, user is redirected to invite acceptance screen
- User can accept or decline the invite

**Testing Command:**

```bash
# iOS Simulator
xcrun simctl openurl booted "https://tripthreads.app/invite/abc123"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "https://tripthreads.app/invite/abc123"
```

### Scenario 2: Authenticated User Clicks Invite Link

**Steps:**

1. User is logged in
2. Click invite link: `https://tripthreads.app/invite/abc123`
3. App opens

**Expected Behavior:**

- App navigates directly to invite acceptance screen
- User sees trip details, inviter name, and role
- User can accept or decline the invite
- After accepting, user is redirected to trip detail screen

### Scenario 3: User Clicks Trip Link

**Steps:**

1. User is logged in
2. Click trip link: `https://tripthreads.app/trips/xyz789`
3. App opens

**Expected Behavior:**

- App navigates directly to trip detail screen
- User sees trip name, dates, description
- User sees itinerary, expenses, and photos sections
- If user is not logged in, redirects to login first

### Scenario 4: App is Already Open

**Steps:**

1. App is already open
2. Click deep link from another app
3. App comes to foreground

**Expected Behavior:**

- App navigates to the appropriate screen
- No duplicate navigation
- User stays authenticated

### Scenario 5: Invalid or Expired Link

**Steps:**

1. Click invalid invite link: `https://tripthreads.app/invite/invalid`
2. App opens

**Expected Behavior:**

- App shows error screen
- Error message: "This invite link is no longer valid"
- User can navigate back to trips list

## Debugging Deep Links

### Enable Logging

Add logging to `lib/linking/deep-link-parser.ts` and `lib/linking/use-deep-link.ts`:

```typescript
console.log('Deep link received:', url)
console.log('Parsed link:', parsedLink)
console.log('Target route:', targetRoute)
console.log('User authenticated:', !!user)
```

### Check React Navigation State

Use React Navigation DevTools to inspect navigation state:

```typescript
import { useNavigationState } from '@react-navigation/native'

const routes = useNavigationState(state => state.routes)
console.log('Current routes:', routes)
```

### Test Parsing Logic

Test the parser directly in a Node REPL or test file:

```typescript
import { parseDeepLink } from './lib/linking/deep-link-parser'

console.log(parseDeepLink('https://tripthreads.app/invite/abc123'))
// { type: 'invite', token: 'abc123' }

console.log(parseDeepLink('tripthreads://trips/xyz789'))
// { type: 'trip', tripId: 'xyz789' }
```

## Universal Links Setup (Production)

### iOS - Apple App Site Association (AASA)

1. **Create AASA file** at `https://tripthreads.app/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.tripthreads.app",
        "paths": ["/invite/*", "/trips/*"]
      }
    ]
  }
}
```

2. **Requirements:**
   - Serve over HTTPS
   - No redirect
   - Content-Type: `application/json` or `application/pkcs7-mime`
   - File must be at root domain

3. **Verify:**
   - Visit: `https://tripthreads.app/.well-known/apple-app-site-association`
   - Use Apple's [AASA Validator](https://search.developer.apple.com/appsearch-validation-tool/)

### Android - Digital Asset Links

1. **Create assetlinks.json** at `https://tripthreads.app/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.tripthreads.app",
      "sha256_cert_fingerprints": ["YOUR_APP_CERTIFICATE_FINGERPRINT"]
    }
  }
]
```

2. **Get Certificate Fingerprint:**

```bash
# From Play Console
# OR from keystore
keytool -list -v -keystore your-release-keystore.jks -alias your-key-alias
```

3. **Verify:**
   - Visit: `https://tripthreads.app/.well-known/assetlinks.json`
   - Use Google's [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator)

## Common Issues

### Issue: Deep Links Not Opening App

**iOS:**

- Check if AASA file is accessible
- Verify `associatedDomains` in app.json
- Ensure app is installed via TestFlight or App Store (dev builds may not work)
- Reset iOS universal links: Settings → Safari → Clear History and Website Data

**Android:**

- Check if assetlinks.json is accessible
- Verify `intentFilters` in app.json
- Ensure `autoVerify: true` is set
- Check app link verification: `adb shell dumpsys package d`

### Issue: App Opens but Doesn't Navigate

- Check `useDeepLink` hook is initialized in root layout
- Verify auth state is loaded before navigation
- Check for navigation errors in console
- Ensure route paths match Expo Router file structure

### Issue: Auth Redirect Not Working

- Verify `redirect` param is passed to login screen
- Check if `router.replace()` is called after successful login
- Ensure user is authenticated before attempting navigation

### Issue: Tests Failing Locally

- Unit tests may not work due to Expo Winter module resolution
- Focus on E2E testing with Detox (as per PRD guidelines)
- Test manually on device or simulator
- E2E tests run automatically in CI/CD

## Next Steps

1. **Deploy Web App** with AASA and assetlinks.json files
2. **Build App** with EAS for TestFlight/Internal Testing
3. **Test on Physical Devices** to verify universal links
4. **Monitor Analytics** (PostHog) to track deep link conversions
5. **Add E2E Tests** with Detox for automated deep link testing

## Resources

- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [Expo Router Deep Linking](https://docs.expo.dev/router/reference/deep-linking/)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
