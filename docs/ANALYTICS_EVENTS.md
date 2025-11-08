# TripThreads Analytics Events Documentation

**Last Updated:** January 2025
**PostHog Status:** Not yet installed (wrapper ready, SDK pending)

## Overview

TripThreads uses PostHog for product analytics to track user behavior, measure engagement, and optimize conversion funnels. This document defines all analytics events, their properties, implementation status, and testing requirements.

### Purpose

Analytics enable us to:

- Understand user onboarding completion rates
- Measure feature adoption and engagement
- Track conversion from Free to Pro
- Identify friction points in user flows
- Monitor offline sync reliability
- Optimize trip planning workflows

---

## Table of Contents

1. [Setup Requirements](#setup-requirements)
2. [Event Naming Conventions](#event-naming-conventions)
3. [Event Categories](#event-categories)
   - [Authentication Events](#authentication-events)
   - [Onboarding Events](#onboarding-events)
   - [Tour Events](#tour-events)
   - [Trip Management Events](#trip-management-events)
   - [Itinerary Events](#itinerary-events)
   - [Expense Events](#expense-events)
   - [Settlement Events](#settlement-events)
   - [Media Events](#media-events)
   - [Offline Sync Events](#offline-sync-events)
   - [Monetization Events](#monetization-events)
4. [Implementation Status](#implementation-status)
5. [Testing Guidelines](#testing-guidelines)
6. [Known Issues](#known-issues)

---

## Setup Requirements

### 1. Install PostHog SDK

```bash
# Web app
cd apps/web
npm install posthog-js

# Mobile app (when ready)
cd apps/mobile
npm install posthog-react-native
```

### 2. Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 3. Create PostHog Provider

Create `apps/web/lib/analytics/posthog-provider.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { useAuth } from '@/lib/auth/auth-context'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    // Initialize PostHog
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.debug()
          }
        },
      })

      // Make available globally for the wrapper
      ;(window as any).posthog = posthog
    }
  }, [])

  // Identify user when authenticated
  useEffect(() => {
    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.full_name,
        plan: user.plan,
      })
    }
  }, [user])

  return <>{children}</>
}
```

### 4. Add to Root Layout

In `apps/web/app/layout.tsx`:

```typescript
import { PostHogProvider } from '@/lib/analytics/posthog-provider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
```

---

## Event Naming Conventions

### Format

```
<category>_<action>_<optional_detail>
```

### Examples

- `onboarding_started`
- `trip_created`
- `expense_added_nl` (natural language)
- `tour_step_advanced`

### Rules

1. Use **snake_case** for event names
2. Use **present tense** for actions (`created`, not `create`)
3. Use **past tense** for completed actions (`completed`, not `complete`)
4. Keep names under 50 characters
5. Avoid abbreviations (except `nl` for natural language)
6. Group related events with common prefixes

### Property Naming

- Use **snake_case** for property keys
- Use descriptive names (`trip_id`, not `id`)
- Include units in numeric properties (`amount_cents`, not `amount`)
- Use ISO 8601 for dates/times

---

## Event Categories

---

## Authentication Events

### `signup`

**When:** User successfully creates an account

**Properties:**

```typescript
{
  method: 'email' | 'google' | 'apple' // Authentication method
  user_id: string // Supabase user ID
}
```

**Implementation Status:** ❌ Not implemented
**File:** `apps/web/app/(auth)/signup/page.tsx`
**Priority:** High (MVP blocker)

**Example:**

```typescript
// After successful email signup
posthog.capture('signup', {
  method: 'email',
  user_id: data.user.id,
})

// After successful OAuth signup
posthog.capture('signup', {
  method: 'google',
  user_id: data.user.id,
})
```

**Test Coverage:** ❌ No tests

---

### `login`

**When:** User successfully signs in

**Properties:**

```typescript
{
  method: 'email' | 'google' | 'apple' // Authentication method
  user_id: string // Supabase user ID
}
```

**Implementation Status:** ❌ Not implemented
**File:** `apps/web/app/(auth)/login/page.tsx`
**Priority:** High (MVP blocker)

**Example:**

```typescript
// After successful login
posthog.capture('login', {
  method: 'email',
  user_id: data.user.id,
})
```

**Test Coverage:** ❌ No tests

---

### `logout`

**When:** User signs out

**Properties:** None

**Implementation Status:** ❌ Not implemented
**File:** `apps/web/lib/auth/auth-context.tsx`
**Priority:** High (MVP blocker)

**Example:**

```typescript
// In signOut function
posthog.capture('logout')
```

**Test Coverage:** ❌ No tests

---

## Onboarding Events

### `onboarding_started`

**When:** User begins first-run onboarding

**Properties:** None

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/onboarding/Onboarding.tsx:60`
**Priority:** High

**Example:**

```typescript
posthog.capture('onboarding_started')
```

**Test Coverage:** ✅ `apps/web/tests/unit/onboarding/onboarding-analytics.test.tsx`

---

### `onboarding_step_viewed`

**When:** User navigates to a new onboarding step

**Properties:**

```typescript
{
  step: 'welcome' | 'roles' | 'features' | 'first-trip'
}
```

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/onboarding/Onboarding.tsx:68`
**Priority:** High

**Example:**

```typescript
posthog.capture('onboarding_step_viewed', { step: 'roles' })
```

**Test Coverage:** ✅ `apps/web/tests/unit/onboarding/onboarding-analytics.test.tsx`

---

### `onboarding_completed`

**When:** User completes all onboarding steps

**Properties:** None

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/onboarding/Onboarding.tsx:75`
**Priority:** High

**Example:**

```typescript
posthog.capture('onboarding_completed')
```

**Test Coverage:** ✅ `apps/web/tests/unit/onboarding/onboarding-analytics.test.tsx`

---

### `onboarding_skipped`

**When:** User skips onboarding

**Properties:**

```typescript
{
  step: 'welcome' | 'roles' | 'features' | 'first-trip' // Current step when skipped
}
```

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/onboarding/Onboarding.tsx:84`
**Priority:** High

**Example:**

```typescript
posthog.capture('onboarding_skipped', { step: currentStep })
```

**Test Coverage:** ✅ `apps/web/tests/unit/onboarding/onboarding-analytics.test.tsx`

---

### `onboarding_platform_detected`

**When:** Platform detection runs during welcome screen

**Properties:**

```typescript
{
  platform: 'mobile' | 'web' // Detected platform
  variant: 'A' | 'B' // A/B test variant
}
```

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/onboarding/PlatformOnboardingScreen.tsx`
**Priority:** Medium

**Example:**

```typescript
posthog.capture('onboarding_platform_detected', {
  platform: 'mobile',
  variant: 'A',
})
```

**Test Coverage:** ✅ `apps/web/tests/unit/onboarding/platform-onboarding-analytics.test.tsx`

---

## Tour Events

### `tour_started`

**When:** User begins a product tour

**Properties:**

```typescript
{
  tour_id: string // e.g., 'first-trip', 'expense-tracking'
}
```

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/tour/Tour.tsx:74`
**Priority:** High

**Example:**

```typescript
posthog.capture('tour_started', { tour_id: 'first-trip' })
```

**Test Coverage:** ✅ `apps/web/tests/unit/tour/tour-analytics.test.tsx`

---

### `tour_step_advanced`

**When:** User moves to next step in tour

**Properties:**

```typescript
{
  tour_id: string // e.g., 'first-trip'
  step: number // Step index (0-based)
  step_id: string // Step identifier (e.g., 'create-trip-button')
}
```

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/tour/Tour.tsx:96-100`
**Priority:** Medium

**Example:**

```typescript
posthog.capture('tour_step_advanced', {
  tour_id: 'first-trip',
  step: 1,
  step_id: 'trip-form',
})
```

**Test Coverage:** ✅ `apps/web/tests/unit/tour/tour-analytics.test.tsx`

---

### `tour_completed`

**When:** User finishes all steps in a tour

**Properties:**

```typescript
{
  tour_id: string // e.g., 'first-trip'
}
```

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/tour/Tour.tsx:88`
**Priority:** High

**Example:**

```typescript
posthog.capture('tour_completed', { tour_id: 'first-trip' })
```

**Test Coverage:** ✅ `apps/web/tests/unit/tour/tour-analytics.test.tsx`

---

### `tour_skipped`

**When:** User permanently skips a tour

**Properties:**

```typescript
{
  tour_id: string // e.g., 'first-trip'
  step: number // Step index when skipped (0-based)
}
```

**Implementation Status:** ✅ Implemented
**File:** `apps/web/components/features/tour/Tour.tsx:114-117`
**Priority:** Medium

**Example:**

```typescript
posthog.capture('tour_skipped', {
  tour_id: 'first-trip',
  step: 2,
})
```

**Test Coverage:** ✅ `apps/web/tests/unit/tour/tour-analytics.test.tsx`

---

### `tour_dismissed`

**When:** User temporarily dismisses a tour (can resume later)

**Properties:**

```typescript
{
  tour_id: string // e.g., 'first-trip'
  step: number // Step index when dismissed (0-based)
}
```

**Implementation Status:** ⚠️ Bug - uses `console.log` instead of `posthog.capture`
**File:** `apps/web/components/features/tour/Tour.tsx:128-131`
**Priority:** Medium

**Example (WRONG):**

```typescript
// Current implementation (BUG)
console.log('[Tour Analytics] tour_dismissed:', {
  tour_id: config.id,
  step: currentStepIndex,
})
```

**Example (CORRECT):**

```typescript
// Should be:
posthog.capture('tour_dismissed', {
  tour_id: config.id,
  step: currentStepIndex,
})
```

**Test Coverage:** ✅ `apps/web/tests/unit/tour/tour-analytics.test.tsx` (but test expects the event)

---

## Trip Management Events

### `trip_created`

**When:** User creates a new trip

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  has_dates: boolean // Whether start/end dates provided
  has_description: boolean // Whether description provided
  source: 'manual' | 'template' | 'import' // Creation source
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (trip creation form)
**Priority:** High (MVP)

**Example:**

```typescript
posthog.capture('trip_created', {
  trip_id: newTrip.id,
  has_dates: !!newTrip.start_date && !!newTrip.end_date,
  has_description: !!newTrip.description,
  source: 'manual',
})
```

**Test Coverage:** ❌ No tests

---

### `trip_deleted`

**When:** User deletes a trip (owner only)

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  participant_count: number // Number of participants
  item_count: number // Number of itinerary items
  expense_count: number // Number of expenses
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (trip settings)
**Priority:** Medium

**Example:**

```typescript
posthog.capture('trip_deleted', {
  trip_id: trip.id,
  participant_count: trip.participants.length,
  item_count: trip.items.length,
  expense_count: trip.expenses.length,
})
```

**Test Coverage:** ❌ No tests

---

### `invite_sent`

**When:** User invites someone to a trip

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  invite_method: 'email' | 'link' | 'qr' // Invitation method
  role: 'participant' | 'viewer' // Invited role
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (invite dialog)
**Priority:** High (MVP)

**Example:**

```typescript
posthog.capture('invite_sent', {
  trip_id: trip.id,
  invite_method: 'email',
  role: 'participant',
})
```

**Test Coverage:** ❌ No tests

---

### `invite_accepted`

**When:** User accepts a trip invitation

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  role: 'participant' | 'viewer' // Accepted role
  invite_method: 'email' | 'link' | 'qr' // How they joined
  is_partial_joiner: boolean // Whether joined mid-trip
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (invite acceptance flow)
**Priority:** High (MVP)

**Example:**

```typescript
posthog.capture('invite_accepted', {
  trip_id: trip.id,
  role: 'participant',
  invite_method: 'link',
  is_partial_joiner: new Date(trip.start_date) < new Date(),
})
```

**Test Coverage:** ❌ No tests

---

## Itinerary Events

### `item_added_nl`

**When:** User adds itinerary item via natural language

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  item_type: 'flight' | 'stay' | 'activity' // Item type
  parse_success: boolean // Whether NL parse succeeded
  has_time: boolean // Whether time extracted
  has_location: boolean // Whether location extracted
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (NL itinerary input)
**Priority:** High (MVP)

**Example:**

```typescript
posthog.capture('item_added_nl', {
  trip_id: trip.id,
  item_type: 'flight',
  parse_success: true,
  has_time: true,
  has_location: true,
})
```

**Test Coverage:** ❌ No tests

---

### `item_added_manual`

**When:** User adds itinerary item via manual form

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  item_type: 'flight' | 'stay' | 'activity' // Item type
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (manual itinerary form)
**Priority:** High (MVP)

**Example:**

```typescript
posthog.capture('item_added_manual', {
  trip_id: trip.id,
  item_type: 'stay',
})
```

**Test Coverage:** ❌ No tests

---

### `item_edited`

**When:** User edits an itinerary item

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  item_id: string // Item UUID
  item_type: 'flight' | 'stay' | 'activity' // Item type
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (itinerary edit form)
**Priority:** Medium

**Example:**

```typescript
posthog.capture('item_edited', {
  trip_id: trip.id,
  item_id: item.id,
  item_type: item.type,
})
```

**Test Coverage:** ❌ No tests

---

### `item_deleted`

**When:** User deletes an itinerary item

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  item_id: string // Item UUID
  item_type: 'flight' | 'stay' | 'activity' // Item type
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (itinerary delete action)
**Priority:** Low

**Example:**

```typescript
posthog.capture('item_deleted', {
  trip_id: trip.id,
  item_id: item.id,
  item_type: item.type,
})
```

**Test Coverage:** ❌ No tests

---

## Expense Events

### `expense_added_nl`

**When:** User adds expense via natural language

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  amount_cents: number // Amount in cents/minor units
  currency: string // ISO 4217 code
  split_type: 'equal' | 'percentage' | 'amount' // Split method
  participant_count: number // Number of people splitting
  parse_success: boolean // Whether NL parse succeeded
  has_receipt: boolean // Whether receipt attached
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (NL expense input)
**Priority:** High (MVP)

**Example:**

```typescript
posthog.capture('expense_added_nl', {
  trip_id: trip.id,
  amount_cents: 6000,
  currency: 'EUR',
  split_type: 'equal',
  participant_count: 4,
  parse_success: true,
  has_receipt: false,
})
```

**Test Coverage:** ❌ No tests

---

### `expense_added_manual`

**When:** User adds expense via manual form

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  amount_cents: number // Amount in cents/minor units
  currency: string // ISO 4217 code
  split_type: 'equal' | 'percentage' | 'amount' // Split method
  participant_count: number // Number of people splitting
  has_receipt: boolean // Whether receipt attached
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (manual expense form)
**Priority:** High (MVP)

**Example:**

```typescript
posthog.capture('expense_added_manual', {
  trip_id: trip.id,
  amount_cents: 4000,
  currency: 'USD',
  split_type: 'percentage',
  participant_count: 3,
  has_receipt: true,
})
```

**Test Coverage:** ❌ No tests

---

### `expense_edited`

**When:** User edits an expense

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  expense_id: string // Expense UUID
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (expense edit form)
**Priority:** Medium

**Example:**

```typescript
posthog.capture('expense_edited', {
  trip_id: trip.id,
  expense_id: expense.id,
})
```

**Test Coverage:** ❌ No tests

---

### `expense_deleted`

**When:** User deletes an expense

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  expense_id: string // Expense UUID
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (expense delete action)
**Priority:** Low

**Example:**

```typescript
posthog.capture('expense_deleted', {
  trip_id: trip.id,
  expense_id: expense.id,
})
```

**Test Coverage:** ❌ No tests

---

## Settlement Events

### `settlement_created`

**When:** System calculates optimized settlements

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  settlement_count: number // Number of settlements generated
  total_debts: number // Number of debts before optimization
  currency: string // Base currency
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (settlement calculation)
**Priority:** Medium

**Example:**

```typescript
posthog.capture('settlement_created', {
  trip_id: trip.id,
  settlement_count: 3,
  total_debts: 6,
  currency: 'EUR',
})
```

**Test Coverage:** ❌ No tests

---

### `settlement_marked_paid`

**When:** User marks a settlement as paid

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  settlement_id: string // Settlement UUID
  amount_cents: number // Settlement amount
  currency: string // Currency code
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (settlement UI)
**Priority:** Medium

**Example:**

```typescript
posthog.capture('settlement_marked_paid', {
  trip_id: trip.id,
  settlement_id: settlement.id,
  amount_cents: settlement.amount,
  currency: settlement.currency,
})
```

**Test Coverage:** ❌ No tests

---

## Media Events

### `photo_uploaded`

**When:** User uploads a photo to trip feed

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  file_size_kb: number // File size in KB
  has_caption: boolean // Whether caption provided
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (photo upload)
**Priority:** Medium (Phase 3)

**Example:**

```typescript
posthog.capture('photo_uploaded', {
  trip_id: trip.id,
  file_size_kb: Math.round(file.size / 1024),
  has_caption: !!caption,
})
```

**Test Coverage:** ❌ No tests

---

### `video_uploaded`

**When:** User uploads a video to trip feed

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  file_size_mb: number // File size in MB
  has_caption: boolean // Whether caption provided
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (video upload)
**Priority:** Low (Phase 3)

**Example:**

```typescript
posthog.capture('video_uploaded', {
  trip_id: trip.id,
  file_size_mb: Math.round(file.size / 1024 / 1024),
  has_caption: !!caption,
})
```

**Test Coverage:** ❌ No tests

---

### `feed_viewed`

**When:** User views the trip feed

**Properties:**

```typescript
{
  trip_id: string // Trip UUID
  photo_count: number // Number of photos in feed
  video_count: number // Number of videos in feed
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (feed page)
**Priority:** Low (Phase 3)

**Example:**

```typescript
posthog.capture('feed_viewed', {
  trip_id: trip.id,
  photo_count: media.photos.length,
  video_count: media.videos.length,
})
```

**Test Coverage:** ❌ No tests

---

## Offline Sync Events

### `went_offline`

**When:** App detects loss of network connectivity

**Properties:**

```typescript
{
  page: string // Current page/route
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (offline provider)
**Priority:** Medium (Phase 2)

**Example:**

```typescript
posthog.capture('went_offline', {
  page: window.location.pathname,
})
```

**Test Coverage:** ❌ No tests

---

### `sync_completed`

**When:** Offline changes successfully sync to server

**Properties:**

```typescript
{
  duration_ms: number // Sync duration
  mutation_count: number // Number of mutations synced
  conflict_count: number // Number of conflicts encountered
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (sync engine)
**Priority:** Medium (Phase 2)

**Example:**

```typescript
posthog.capture('sync_completed', {
  duration_ms: Date.now() - syncStartTime,
  mutation_count: queue.length,
  conflict_count: conflicts.length,
})
```

**Test Coverage:** ❌ No tests

---

### `sync_failed`

**When:** Offline sync fails

**Properties:**

```typescript
{
  error: string // Error message
  mutation_count: number // Number of mutations in queue
  retry_count: number // Number of retry attempts
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (sync engine)
**Priority:** Medium (Phase 2)

**Example:**

```typescript
posthog.capture('sync_failed', {
  error: error.message,
  mutation_count: queue.length,
  retry_count: retryAttempts,
})
```

**Test Coverage:** ❌ No tests

---

## Monetization Events

### `upgrade_viewed`

**When:** User views Pro upgrade page

**Properties:** None

**Implementation Status:** ❌ Not implemented
**File:** TBD (upgrade page)
**Priority:** High (Phase 3)

**Example:**

```typescript
posthog.capture('upgrade_viewed')
```

**Test Coverage:** ❌ No tests

---

### `checkout_started`

**When:** User clicks "Upgrade to Pro" button

**Properties:**

```typescript
{
  plan: 'monthly' | 'annual' // Selected plan
  source: string // Page where upgrade initiated
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (upgrade button)
**Priority:** High (Phase 3)

**Example:**

```typescript
posthog.capture('checkout_started', {
  plan: 'annual',
  source: '/trips/123',
})
```

**Test Coverage:** ❌ No tests

---

### `subscription_completed`

**When:** User successfully completes Stripe checkout

**Properties:**

```typescript
{
  plan: 'monthly' | 'annual' // Selected plan
  amount_cents: number // Payment amount
  currency: string // Currency code
  stripe_subscription_id: string // Stripe subscription ID
}
```

**Implementation Status:** ❌ Not implemented
**File:** TBD (Stripe webhook handler)
**Priority:** High (Phase 3)

**Example:**

```typescript
// In Stripe webhook handler
posthog.capture('subscription_completed', {
  plan: metadata.plan,
  amount_cents: session.amount_total,
  currency: session.currency.toUpperCase(),
  stripe_subscription_id: subscription.id,
})
```

**Test Coverage:** ❌ No tests

---

## Implementation Status

### Summary

| Category        | Implemented | Buggy | Not Implemented | Total  |
| --------------- | ----------- | ----- | --------------- | ------ |
| Authentication  | 0           | 0     | 3               | 3      |
| Onboarding      | 5           | 0     | 0               | 5      |
| Tours           | 4           | 1     | 0               | 5      |
| Trip Management | 0           | 0     | 3               | 3      |
| Itinerary       | 0           | 0     | 4               | 4      |
| Expenses        | 0           | 0     | 4               | 4      |
| Settlements     | 0           | 0     | 2               | 2      |
| Media           | 0           | 0     | 3               | 3      |
| Offline Sync    | 0           | 0     | 3               | 3      |
| Monetization    | 0           | 0     | 3               | 3      |
| **TOTAL**       | **9**       | **1** | **25**          | **35** |

### Phase Priority

**Phase 1 (MVP Core):**

- ✅ Onboarding events (complete)
- ✅ Tour events (complete except tour_dismissed bug)
- ❌ Authentication events (critical gap)
- ❌ Trip management events (needed for MVP)
- ❌ Itinerary events (needed for MVP)
- ❌ Expense events (needed for MVP)

**Phase 2 (Itinerary & Ledger):**

- ❌ Offline sync events

**Phase 3 (Media & Pro):**

- ❌ Media events
- ❌ Monetization events
- ❌ Settlement events

---

## Testing Guidelines

### Unit Test Requirements

Every analytics event must have unit tests verifying:

1. ✅ Event is captured with correct name
2. ✅ Event properties match expected schema
3. ✅ Event fires at the correct time in component lifecycle
4. ✅ Event doesn't fire during SSR (server-side rendering)

### Test Structure

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { posthog } from '@/lib/analytics/posthog'
import { ComponentUnderTest } from './ComponentUnderTest'

// Mock PostHog
jest.mock('@/lib/analytics/posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}))

describe('Component Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('captures event_name when action occurs', () => {
    render(<ComponentUnderTest />)

    fireEvent.click(screen.getByRole('button', { name: 'Action' }))

    expect(posthog.capture).toHaveBeenCalledWith('event_name', {
      property: 'value',
    })
  })

  it('does not capture event during SSR', () => {
    // Simulate SSR by mocking window as undefined
    const originalWindow = global.window
    // @ts-ignore
    delete global.window

    render(<ComponentUnderTest />)

    expect(posthog.capture).not.toHaveBeenCalled()

    // Restore window
    global.window = originalWindow
  })
})
```

### E2E Test Coverage

Critical user flows should have E2E tests verifying analytics:

```typescript
import { test, expect } from '@playwright/test'

test('signup flow captures analytics events', async ({ page }) => {
  // Intercept PostHog requests
  const events: string[] = []
  await page.route('**/decide*', route => route.fulfill())
  await page.route('**/e/*', async route => {
    const body = route.request().postDataJSON()
    events.push(body.event)
    await route.fulfill()
  })

  // Perform signup
  await page.goto('/signup')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('[type="submit"]')

  // Verify events
  expect(events).toContain('signup')
})
```

---

## Known Issues

### Critical Issues

1. **PostHog SDK Not Installed** ❌
   - **Impact:** No events are being tracked (all capture calls are no-ops)
   - **Fix:** Run `npm install posthog-js --workspace=web`
   - **Priority:** Blocker for production launch

2. **Authentication Events Missing** ❌
   - **Impact:** Cannot track user acquisition funnel
   - **Files:** `apps/web/app/(auth)/signup/page.tsx`, `apps/web/app/(auth)/login/page.tsx`
   - **Priority:** High (MVP blocker)

3. **Tour Dismissed Event Bug** ⚠️
   - **Impact:** `tour_dismissed` uses `console.log` instead of `posthog.capture`
   - **File:** `apps/web/components/features/tour/Tour.tsx:128-131`
   - **Fix:** Replace `console.log` with `posthog.capture`
   - **Priority:** Medium (easy 5-minute fix)

### Non-Critical Issues

4. **Trip Management Events Missing** ❌
   - **Impact:** Cannot track trip creation/deletion/invite flows
   - **Priority:** High (MVP)

5. **Itinerary Events Missing** ❌
   - **Impact:** Cannot measure itinerary feature adoption
   - **Priority:** High (MVP)

6. **Expense Events Missing** ❌
   - **Impact:** Cannot track expense tracking usage
   - **Priority:** High (MVP)

7. **No Analytics Documentation** ❌
   - **Impact:** This document is the first documentation
   - **Status:** ✅ Resolved (this file)
   - **Priority:** Medium

---

## Quick Start Checklist

When ready to activate PostHog:

- [ ] Install `posthog-js` package
- [ ] Create PostHog provider component
- [ ] Add provider to root layout
- [ ] Set environment variables in `.env.local`
- [ ] Test in development with `posthog.debug()`
- [ ] Add authentication events
- [ ] Fix tour_dismissed bug
- [ ] Add trip management events
- [ ] Add itinerary events
- [ ] Add expense events
- [ ] Deploy to staging and verify events in PostHog dashboard
- [ ] Set up PostHog dashboards for key metrics
- [ ] Configure session recordings for Pro users
- [ ] Deploy to production

---

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog React Integration](https://posthog.com/docs/libraries/react)
- [PostHog Event Properties Best Practices](https://posthog.com/docs/data/properties)
- [CLAUDE.md - Analytics Plan](../CLAUDE.md#-monitoring--analytics)
- [PRD - Success Metrics](../PRD.md)

---

**End of Document**
