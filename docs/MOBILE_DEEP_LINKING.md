# TripThreads Deep Linking Implementation Analysis

## Executive Summary

The TripThreads mobile app currently has **minimal deep linking configuration**. The app uses Expo Router (v6.0.13) for navigation but lacks:

- Structured deep linking configuration in app.json
- Route handlers for dynamic links (invites, trips)
- URL scheme registration for mobile platforms
- Link interception and routing logic

This document outlines the current state, what needs to be added, and implementation patterns observed from the web app.

---

## 1. Current Mobile App Configuration

### app.json - Current State

```json
{
  "expo": {
    "name": "TripThreads",
    "slug": "tripthreads",
    "version": "1.0.0",
    "scheme": "tripthreads",
    "newArchEnabled": true
    // ... other config ...
  }
}
```

**Current Setup:**

- URL scheme: `tripthreads://` is defined
- **Missing:** `linking` configuration object
- **Missing:** Deep link prefixes for web fallbacks
- **Missing:** Dynamic route mappings

### Package Dependencies

```json
{
  "expo": "~54.0.20",
  "expo-router": "^6.0.13",
  "expo-linking": "^8.0.8",
  "react-native": "0.81.5"
}
```

**Good News:**

- `expo-linking` is installed but not actively used
- `expo-router` is the navigation framework (file-based routing)
- New Architecture is enabled for better performance

---

## 2. Current Mobile App Structure

### Directory Layout

```
apps/mobile/
├── app/
│   ├── _layout.tsx           # Root layout with Stack navigation
│   ├── index.tsx             # Home screen
│   └── components-demo.tsx   # Demo screen
├── components/
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       └── sheet.tsx
├── lib/
│   ├── auth/
│   │   └── auth-context.tsx  # Auth state management
│   ├── supabase/
│   │   └── client.ts         # Supabase client setup
│   └── utils.ts
├── app.json                  # Expo configuration
├── package.json
└── tsconfig.json
```

### Root Layout (\_layout.tsx)

```tsx
import { Stack } from 'expo-router'
import '../global.css'

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

**Current State:**

- Uses Stack navigator (simple linear navigation)
- No linking configuration
- No linking event handlers
- No dynamic route registration

### Index Screen (index.tsx)

```tsx
export default function Index() {
  return (
    <View>
      <Link href="/components-demo" asChild>
        <Button>View Mobile Components</Button>
      </Link>
    </View>
  )
}
```

**Current Usage:**

- Uses expo-router's `<Link>` component for navigation
- Only static links (no dynamic route handling)
- No URL scheme handling

### Auth Context (auth-context.tsx)

```tsx
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
}
```

**Current State:**

- Basic auth methods (signUp, signIn, signOut, Google OAuth)
- No invite/link acceptance handling
- No deep link state management
- Uses Supabase Auth with SecureStore for token persistence

### Supabase Client (lib/supabase/client.ts)

```tsx
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // <-- Important for mobile
  },
})
```

**Current State:**

- `detectSessionInUrl: false` - Good for mobile (doesn't try URL-based auth)
- Uses Expo SecureStore for secure token storage
- Ready for Supabase integration

---

## 3. Web App Patterns (Reference for Mobile)

### Web Invite Page Structure (apps/web/app/invite/[token]/page.tsx)

**Features Implemented:**

1. **Public page** - No auth required to view (redirects if not logged in)
2. **Token extraction** - From dynamic route parameter
3. **Invite validation** - Checks if token exists and is valid
4. **User state checks:**
   - Not authenticated → redirect to login with return URL
   - Already a participant → redirect to trip
   - Invalid/expired token → show error page
5. **Acceptance** - Uses `InviteAcceptanceCard` component

**Flow:**

```
User clicks invite link
  ↓
If not logged in → Redirect to /login?redirect=/invite/[token]
  ↓
If already member → Redirect to /trips/[id]
  ↓
If invalid → Show error page
  ↓
Show InviteAcceptanceCard with trip details & accept button
```

### Web Auth Context Pattern

```tsx
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
```

**Key Points:**

- OAuth includes explicit `redirectTo` option
- Web app uses `/auth/callback` route for OAuth

### Web Trip Detail Page

```tsx
// Dynamic route: /trips/[id]
export default async function TripDetailPage({ params }: { props }) {
  const trip = await getTripById(supabase, params.id)
  // ... render trip with expenses, itinerary, feed
}
```

**Structure:**

- Dynamic route parameter: `[id]`
- Server-rendered (async components)
- Full trip data fetching on first load

---

## 4. Shared Utilities Available to Mobile

### Invite Types (packages/shared/types/invite.ts)

```typescript
export interface TripInvite {
  id: string
  trip_id: string
  token: string
  email: string | null
  invited_by: string
  role: InviteRole
  invite_type: InviteType
  status: InviteStatus
  use_count: number
  created_at: string
  accepted_at: string | null
}

export interface InviteWithDetails {
  invite: { id; token; role; invite_type; status; created_at }
  trip: { id; name; start_date; end_date; cover_image_url; description }
  inviter: { id; full_name; avatar_url }
}
```

### Invite Queries (packages/shared/lib/supabase/queries/invites.ts)

**Available Functions:**

- `getInviteUrl(token, baseUrl)` - Generate invite URL
- `getInviteByToken(supabase, token)` - Fetch invite by token
- `getInviteWithDetails(supabase, token)` - Fetch invite with trip & inviter info
- `acceptInvite(supabase, token, dateRange?)` - Accept invite & add to trip
- `revokeInvite(supabase, inviteId)` - Revoke invite
- `getTripInvites(supabase, tripId)` - Get all invites for trip

### Trip Queries (packages/shared/lib/supabase/queries/trips.ts)

**Available Functions:**

- `getUserTrips(supabase)` - Get all user's trips
- `getTripById(supabase, tripId)` - Get single trip with participants
- `createTrip(supabase, trip)` - Create new trip
- `updateTrip(supabase, tripId, updates)` - Update trip
- `deleteTrip(supabase, tripId)` - Delete trip
- `isTripOwner(supabase, tripId)` - Check ownership

---

## 5. What Needs to Be Added

### 5.1 App.json Configuration

**Add to `app.json`:**

```json
{
  "expo": {
    "name": "TripThreads",
    "slug": "tripthreads",
    "scheme": "tripthreads",

    // NEW: Deep linking configuration
    "plugins": [
      [
        "expo-router",
        {
          "origin": null // Will be set by EAS
        }
      ]
    ],

    "web": {
      "bundleUrl": "https://tripthreads.app" // Web fallback
    }
  }
}
```

**For EAS (Expo Application Services) - iOS & Android:**

```json
{
  "ios": {
    "associatedDomains": ["applinks:tripthreads.app", "applinks:www.tripthreads.app"]
  },
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": {
          "scheme": "https",
          "host": "tripthreads.app"
        },
        "category": ["BROWSABLE", "DEFAULT"]
      },
      {
        "action": "VIEW",
        "data": {
          "scheme": "tripthreads"
        }
      }
    ]
  }
}
```

### 5.2 Route Structure Needed

Create these new screens:

```
apps/mobile/app/
├── _layout.tsx                    # Existing: Root layout
├── index.tsx                      # Existing: Home
├── (auth)/
│   ├── _layout.tsx               # NEW: Auth layout
│   ├── login.tsx                 # NEW: Login screen
│   └── signup.tsx                # NEW: Signup screen
├── (app)/
│   ├── _layout.tsx               # NEW: App layout (tabs/navigation)
│   ├── trips/
│   │   ├── index.tsx             # NEW: Trips list
│   │   └── [id].tsx              # NEW: Trip detail (dynamic route)
│   └── settings.tsx              # NEW: Settings
├── invite/
│   └── [token].tsx               # NEW: Invite acceptance (dynamic route)
└── link-handler.tsx              # NEW: Link interception handler
```

### 5.3 Root Layout Enhancement

**Current (\_layout.tsx):**

```tsx
import { Stack } from 'expo-router'
import '../global.css'

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

**Needed: Link handling**

```tsx
import { Stack, usePathname, router } from 'expo-router'
import * as Linking from 'expo-linking'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'

const linking = {
  prefixes: ['tripthreads://', 'https://tripthreads.app', 'https://www.tripthreads.app'],
  config: {
    screens: {
      invite: 'invite/:token',
      '(app)/trips/[id]': 'trips/:id',
      // ... other routes
    },
  },
}

export default function RootLayout() {
  const { user, loading } = useAuth()

  // Handle incoming links
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink)

    // Check for initial URL (app opened from link)
    Linking.getInitialURL().then(url => {
      if (url != null) handleDeepLink({ url })
    })

    return () => subscription.remove()
  }, [])

  const handleDeepLink = ({ url }: { url: string }) => {
    const path = url.replace(/.*?:\/\//g, '')
    router.push(path)
  }

  return (
    <Stack linking={linking} fallback={<LoadingScreen />} screenOptions={{ headerShown: false }}>
      {/* Route definitions */}
    </Stack>
  )
}
```

### 5.4 Invite Acceptance Screen

**New file: apps/mobile/app/invite/[token].tsx**

```tsx
import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
import { getInviteWithDetails, acceptInvite } from '@tripthreads/shared'
import { Button } from '@/components/ui/button'

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const [inviteDetails, setInviteDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) return
    loadInvite()
  }, [token])

  const loadInvite = async () => {
    try {
      setLoading(true)
      const details = await getInviteWithDetails(supabase, token as string)

      if (!details) {
        setError('Invite not found or expired')
        return
      }

      setInviteDetails(details)
    } catch (err) {
      setError('Failed to load invite')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!user || !token) return

    try {
      setAccepting(true)
      const result = await acceptInvite(supabase, token as string)
      router.push(`/(app)/trips/${result.trip_id}`)
    } catch (err) {
      setError('Failed to accept invite')
      console.error(err)
    } finally {
      setAccepting(false)
    }
  }

  if (authLoading || loading) return <LoadingScreen />

  if (!user) {
    return (
      <View>
        <Text>Please log in to accept this invite</Text>
        <Button onPress={() => router.push('/(auth)/login')}>Sign In</Button>
      </View>
    )
  }

  if (error) {
    return (
      <View>
        <Text>{error}</Text>
        <Button onPress={() => router.push('/(app)/trips')}>View Trips</Button>
      </View>
    )
  }

  if (!inviteDetails) return null

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        <Text className="text-2xl font-bold mb-4">{inviteDetails.trip.name}</Text>
        <Text className="text-muted-foreground mb-6">
          {inviteDetails.inviter.full_name} invited you to join this trip
        </Text>

        {/* Trip details */}
        {/* Accept/Decline buttons */}

        <Button onPress={handleAccept} disabled={accepting}>
          {accepting ? 'Accepting...' : 'Accept Invite'}
        </Button>
      </View>
    </ScrollView>
  )
}
```

### 5.5 Trip Detail Screen

**New file: apps/mobile/app/(app)/trips/[id].tsx**

```tsx
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getTripById } from '@tripthreads/shared'

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadTrip()
  }, [id])

  const loadTrip = async () => {
    try {
      setLoading(true)
      const tripData = await getTripById(supabase, id as string)
      setTrip(tripData)
    } catch (err) {
      console.error('Error loading trip:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingScreen />
  if (!trip) return <ErrorScreen />

  return (
    <View>
      <Text className="text-2xl font-bold">{trip.name}</Text>
      {/* Trip details: dates, participants, itinerary, expenses */}
    </View>
  )
}
```

### 5.6 Auth Routes

**New file: apps/mobile/app/(auth)/\_layout.tsx**

```tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: false, // No animation between auth screens
      }}
    />
  )
}
```

**New file: apps/mobile/app/(auth)/login.tsx**

Mobile version of web login screen with OAuth and email/password support.

---

## 6. URL Scheme Patterns

### Standard Format

```
tripthreads://invite/abc123def456
tripthreads://trips/xyz789

https://tripthreads.app/invite/abc123def456
https://tripthreads.app/trips/xyz789
```

### Deep Link Prefixes

1. **Custom URL Scheme:** `tripthreads://`
   - Used for: Native mobile links, QR codes, SMS
   - iOS: Opens app if installed, app chooser otherwise
   - Android: Opens app if installed, error otherwise

2. **HTTPS (Universal Links / App Links)**
   - iOS: Requires `associatedDomains` capability
   - Android: Requires domain verification (assetlinks.json)
   - Fallback: Opens in browser (web version)
   - Best for: Email, web share, cross-platform

3. **Web Fallback**
   - `https://tripthreads.app/invite/[token]` → Web app
   - `https://tripthreads.app/trips/[id]` → Web app

---

## 7. Implementation Checklist

### Phase 1: Core Deep Linking (Essential)

- [ ] Update `app.json` with linking configuration
- [ ] Create `apps/mobile/app/(auth)` group layout
- [ ] Create `apps/mobile/app/(app)` group layout
- [ ] Add `invite/[token].tsx` screen
- [ ] Add `(app)/trips/[id].tsx` screen
- [ ] Enhance root `_layout.tsx` with Linking event handlers
- [ ] Handle initial URL when app opens from link
- [ ] Implement auth redirect for non-logged-in users

### Phase 2: Auth Routes (Important)

- [ ] Create `(auth)/login.tsx` screen
- [ ] Create `(auth)/signup.tsx` screen
- [ ] Implement OAuth callback handling
- [ ] Protected route guards

### Phase 3: Navigation Structure (Important)

- [ ] Create `(app)/trips/index.tsx` (trips list)
- [ ] Create `(app)/settings.tsx` (settings)
- [ ] Bottom tab navigator for (app) routes
- [ ] Header/navigation UI

### Phase 4: Testing & Deployment (Important)

- [ ] Test with `expo://` links locally
- [ ] Test with EAS build for iOS
- [ ] Verify associated domains on iOS
- [ ] Verify app links on Android
- [ ] Test OAuth callback flow
- [ ] Test invite acceptance flow end-to-end

### Phase 5: Analytics & Error Handling (Future)

- [ ] Log deep link events to PostHog
- [ ] Error handling for invalid/expired invites
- [ ] Fallback behavior for unknown routes
- [ ] Toast notifications for actions

---

## 8. Key Differences: Web vs Mobile

| Feature               | Web                       | Mobile                        |
| --------------------- | ------------------------- | ----------------------------- |
| **Navigation**        | Next.js App Router        | Expo Router                   |
| **Dynamic Routes**    | `[token]`, `[id]`         | `[token]`, `[id]`             |
| **Auth Check**        | Server-side (async pages) | Client-side (useAuth hook)    |
| **Linking**           | HTML links, Next.js Link  | expo-router Link, Linking API |
| **URL Scheme**        | https:// only             | https:// + custom scheme      |
| **OAuth Redirect**    | `/auth/callback`          | Platform-specific             |
| **Storage**           | localStorage              | expo-secure-store             |
| **Initial Load**      | Full server render        | Client-side data fetch        |
| **Session Detection** | URL-based                 | Token from storage            |

---

## 9. Critical Implementation Notes

### Auth Flow for Deep Links

```
User clicks invite link (authenticated)
  ↓
App opens to invite/[token]
  ↓
useAuth() checks user state (loads from storage)
  ↓
If logged in → Show invite details
  ↓
Accept → getInviteWithDetails() → acceptInvite() → router.push(/trips/[id])
  ↓
Trip screen loads via getTripById()
```

**Important:** Auth context loads from storage asynchronously, so root layout needs `fallback` component.

### Error Cases to Handle

1. **Invite expired/revoked:** Show error page with "View Trips" button
2. **User already member:** Redirect directly to trip
3. **Invalid token:** Show error, offer to return to home
4. **Network error:** Retry logic with offline indicator
5. **OAuth failure:** Error message + retry button

### Performance Considerations

1. **Lazy loading:** Load trip details only when screen is focused
2. **Caching:** Cache trip data to reduce API calls
3. **Image loading:** Lazy load trip cover images
4. **Bundle size:** Dynamic imports for screens not initially visible

---

## 10. Future Enhancements

1. **Deep Link Shortener:** Generate short URLs for invites
2. **QR Codes:** Generate QR codes for mobile-friendly sharing
3. **SMS Integration:** Send invite links via SMS
4. **Share Extensions:** Share trip from Photos app
5. **Notification Links:** Push notifications with trip/invite links
6. **Referral Program:** Tracking via deep links
7. **Analytics:** Event tracking for link click → acceptance conversion

---

## Files to Create/Modify

### Create New Files

```
apps/mobile/app/(auth)/_layout.tsx
apps/mobile/app/(auth)/login.tsx
apps/mobile/app/(auth)/signup.tsx
apps/mobile/app/(app)/_layout.tsx
apps/mobile/app/(app)/trips/index.tsx
apps/mobile/app/(app)/trips/[id].tsx
apps/mobile/app/(app)/settings.tsx
apps/mobile/app/invite/[token].tsx
apps/mobile/lib/linking/configuration.ts
apps/mobile/lib/linking/handlers.ts
apps/mobile/components/features/invite/InviteAcceptanceCard.tsx
apps/mobile/components/features/trips/TripCard.tsx
apps/mobile/components/features/trips/TripDetail.tsx
```

### Modify Existing Files

```
apps/mobile/app.json                                    # Add linking config
apps/mobile/app/_layout.tsx                             # Add link handlers
apps/mobile/lib/auth/auth-context.tsx                   # Add link-related state
apps/mobile/package.json                                # Add @react-native-async-storage if needed
```

---

## Resources & References

- [Expo Router Deep Linking Docs](https://expo.dev/docs/router/linking/)
- [Expo Linking API](https://docs.expo.dev/versions/latest/sdk/linking/)
- [Universal Links (iOS)](https://developer.apple.com/ios/universal-links/)
- [App Links (Android)](https://developer.android.com/training/app-links)
- [EAS Build Documentation](https://docs.expo.dev/build/setup/)
