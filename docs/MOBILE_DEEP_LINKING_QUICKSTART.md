# Mobile Deep Linking - Quick Start Guide

## Current State: NOT CONFIGURED

The mobile app has the foundation but deep linking is not implemented.

**Status:**

- URL scheme `tripthreads://` defined in app.json ✓
- expo-linking installed ✓
- expo-router installed ✓
- **Deep linking configuration: NOT IMPLEMENTED** ✗
- **Dynamic route screens: NOT CREATED** ✗

---

## What Users Need Deep Linking For

1. **Accept Trip Invites** - Click link from email/SMS

   ```
   https://tripthreads.app/invite/abc123
   → Opens mobile app to invite screen
   → User logs in if needed
   → Accepts invite → Joins trip
   ```

2. **Direct Trip Access** - Share trip link
   ```
   https://tripthreads.app/trips/xyz789
   → Opens mobile app directly to trip
   → Shows itinerary, expenses, photos
   ```

---

## Files That Need to Be Created

### Core Deep Linking (Priority 1)

```
apps/mobile/app/
├── (auth)/
│   ├── _layout.tsx              # Auth group layout
│   ├── login.tsx                # Login screen
│   └── signup.tsx               # Signup screen
├── (app)/
│   ├── _layout.tsx              # App group layout (tabs)
│   ├── trips/
│   │   ├── index.tsx            # Trip list
│   │   └── [id].tsx             # Trip detail (DYNAMIC)
│   └── settings.tsx             # Settings
├── invite/
│   └── [token].tsx              # Invite acceptance (DYNAMIC)
└── _layout.tsx                  # MODIFY: Add linking config
```

---

## Implementation Order

### Step 1: Update app.json

Add linking configuration to enable deep link routing.

### Step 2: Create Auth Routes

- `(auth)/_layout.tsx` - Group layout
- `(auth)/login.tsx` - Login screen
- `(auth)/signup.tsx` - Signup screen

### Step 3: Create App Routes

- `(app)/_layout.tsx` - App layout with tabs
- `(app)/trips/index.tsx` - Trips list
- `(app)/trips/[id].tsx` - Trip detail screen

### Step 4: Create Invite Screen

- `invite/[token].tsx` - Handles invite links

### Step 5: Update Root Layout

- Enhance `_layout.tsx` with deep link handlers

### Step 6: Test

- Local testing: `tripthreads://invite/test123`
- EAS build for iOS
- EAS build for Android

---

## Key Code Patterns

### Dynamic Route Parameters

```tsx
import { useLocalSearchParams } from 'expo-router'

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  // token is now: "abc123"
}
```

### Deep Link Handling in Root Layout

```tsx
import * as Linking from 'expo-linking'

useEffect(() => {
  // Handle links when app is already open
  const subscription = Linking.addEventListener('url', ({ url }) => {
    const path = url.replace(/.*?:\/\//g, '')
    router.push(path)
  })

  // Handle app opening from link
  Linking.getInitialURL().then(url => {
    if (url != null) {
      const path = url.replace(/.*?:\/\//g, '')
      router.push(path)
    }
  })

  return () => subscription.remove()
}, [])
```

### Auth Redirect with Return URL

```tsx
const { user } = useAuth()

if (!user) {
  return <Button onPress={() => router.push('/(auth)/login')}>Sign In to Accept Invite</Button>
}
```

---

## Shared Functions Available

These are already built and available from `@tripthreads/shared`:

```tsx
import {
  getInviteWithDetails, // Load invite data
  acceptInvite, // Accept invite
  getTripById, // Load trip details
  getUserTrips, // Load all user trips
} from '@tripthreads/shared'
```

**Example: Load invite**

```tsx
const details = await getInviteWithDetails(supabase, token)
// Returns: { invite, trip, inviter }
```

**Example: Accept invite**

```tsx
const result = await acceptInvite(supabase, token)
// Returns: { trip_id, participant_id, role }
router.push(`/(app)/trips/${result.trip_id}`)
```

---

## URL Scheme Format

### Custom Scheme (Mobile App Only)

```
tripthreads://invite/abc123def456
tripthreads://trips/xyz789
```

### HTTPS (Fallback to Web)

```
https://tripthreads.app/invite/abc123def456
https://tripthreads.app/trips/xyz789
```

### Route Mapping in app.json

```json
{
  "linking": {
    "screens": {
      "invite": "invite/:token",
      "(app)/trips/[id]": "trips/:id"
    }
  }
}
```

---

## Common Pitfalls

1. **Forgetting to handle async auth loading**
   - Auth context loads from storage asynchronously
   - Root layout needs `fallback` component
   - Check `useAuth().loading` before showing content

2. **Not handling "already a member" case**
   - When user accepts invite but is already in trip
   - Should redirect directly to trip, not error

3. **Missing error states**
   - Invalid/expired invite token
   - Network errors during accept
   - OAuth callback failures

4. **Not testing with actual links**
   - Local testing only catches some issues
   - Need to test with real URLs on device
   - EAS build required for iOS/Android testing

---

## Testing Checklist

- [ ] Local test with custom scheme: `tripthreads://invite/test123`
- [ ] Test invite flow end-to-end:
  - Click link → Load invite → Accept → See trip
- [ ] Test unauthenticated flow:
  - Click link without logging in → Redirect to login → Return to invite
- [ ] Test error cases:
  - Invalid token → Show error
  - Already member → Redirect to trip
  - Network error → Retry
- [ ] Test EAS builds:
  - iOS with associatedDomains
  - Android with intentFilters
- [ ] Test web fallback:
  - https://tripthreads.app links open web app when app not installed

---

## Resources

- [Expo Router Linking Docs](https://expo.dev/docs/router/linking/)
- [Expo Linking API](https://docs.expo.dev/versions/latest/sdk/linking/)
- [MOBILE_DEEP_LINKING.md](./MOBILE_DEEP_LINKING.md) - Full detailed guide

---

## See Also

- Full implementation guide: `docs/MOBILE_DEEP_LINKING.md`
- Web invite reference: `apps/web/app/invite/[token]/page.tsx`
- Shared functions: `packages/shared/lib/supabase/queries/invites.ts`
