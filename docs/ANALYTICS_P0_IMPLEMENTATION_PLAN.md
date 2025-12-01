# P0 Analytics Implementation Plan

**Goal:** Implement 5 critical analytics events blocking MVP launch
**Estimated Time:** 9-13 hours
**Priority:** 🚨 MVP Blocker

---

## Prerequisites

### 1. Install PostHog SDK (~30 minutes)

```bash
cd apps/web
npm install posthog-js
```

**Verification:**

```bash
grep "posthog-js" apps/web/package.json
```

---

### 2. Create PostHog Provider (~30 minutes)

**File:** `apps/web/lib/analytics/posthog-provider.tsx`

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
        plan: 'free', // TODO: Update when Pro tier implemented
      })
    }
  }, [user])

  return <>{children}</>
}
```

**Add to root layout:** `apps/web/app/layout.tsx`

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

**Environment variables:** Add to `.env.local`

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## P0 Events Implementation

### Event 1: `signup` (~1 hour + 1 hour tests)

**File:** `apps/web/app/(auth)/signup/page.tsx`

**Location:** Line 31 (after successful signup)

**Implementation:**

```typescript
import { posthog } from '@/lib/analytics/posthog'

// In handleSubmit function, after successful signup
const { error: signUpError } = await signUp(email, password, fullName)

if (signUpError) {
  setError(signUpError.message)
  setLoading(false)
} else {
  // Track signup event
  posthog.capture('signup', {
    method: 'email',
    user_id: /* get user ID from signup response */,
  })

  setSuccess(true)
  setTimeout(() => {
    router.push('/trips')
  }, 2000)
}
```

**For Google OAuth:**

```typescript
// In handleGoogleSignIn function
const { error: signInError } = await signInWithGoogle()

if (signInError) {
  setError(signInError.message)
  setLoading(false)
} else {
  // Track Google signup
  posthog.capture('signup', {
    method: 'google',
    user_id: /* get user ID from OAuth response */,
  })
}
```

**Test File:** `apps/web/tests/unit/auth/signup-analytics.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { posthog } from '@/lib/analytics/posthog'
import SignupPage from '@/app/(auth)/signup/page'

jest.mock('@/lib/analytics/posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}))

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    signUp: jest.fn().mockResolvedValue({ error: null }),
    signInWithGoogle: jest.fn().mockResolvedValue({ error: null }),
  }),
}))

describe('Signup Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('captures signup event with email method', async () => {
    render(<SignupPage />)

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('signup', {
        method: 'email',
        user_id: expect.any(String),
      })
    })
  })

  it('captures signup event with google method', async () => {
    render(<SignupPage />)

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('signup', {
        method: 'google',
        user_id: expect.any(String),
      })
    })
  })
})
```

---

### Event 2: `login` (~1 hour + 1 hour tests)

**File:** `apps/web/app/(auth)/login/page.tsx`

**Implementation:** Similar to signup, track after successful login

```typescript
posthog.capture('login', {
  method: 'email', // or 'google'
  user_id: data.user.id,
})
```

**Test File:** `apps/web/tests/unit/auth/login-analytics.test.tsx`

---

### Event 3: `trip_created` (~1 hour + 1 hour tests)

**File:** `apps/web/components/features/trips/CreateTripDialog.tsx`

**Location:** Line 71 (after successful trip creation)

**Implementation:**

```typescript
import { posthog } from '@/lib/analytics/posthog'

// In onSubmit function, after successful trip creation
const result = await createTrip(values)

if (!result.success || !result.trip) {
  toast({
    title: 'Error creating trip',
    description: result.error || 'An unexpected error occurred',
    variant: 'destructive',
  })
  return
}

// Track trip creation
posthog.capture('trip_created', {
  trip_id: result.trip.id,
  has_dates: !!result.trip.start_date && !!result.trip.end_date,
  has_description: !!result.trip.description,
  source: 'manual',
})

toast({
  title: 'Trip created!',
  description: `${result.trip.name} has been created successfully.`,
})
```

**Test File:** `apps/web/tests/unit/trips/create-trip-analytics.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { posthog } from '@/lib/analytics/posthog'
import { CreateTripDialog } from '@/components/features/trips/CreateTripDialog'

jest.mock('@/lib/analytics/posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}))

describe('CreateTripDialog Analytics', () => {
  it('captures trip_created event with full data', async () => {
    const mockCreateTrip = jest.fn().mockResolvedValue({
      success: true,
      trip: {
        id: 'trip-123',
        name: 'Paris 2025',
        start_date: '2025-06-01',
        end_date: '2025-06-07',
        description: 'Summer vacation',
      },
    })

    render(
      <CreateTripDialog
        open={true}
        onOpenChange={jest.fn()}
      />
    )

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/trip name/i), {
      target: { value: 'Paris 2025' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create trip/i }))

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('trip_created', {
        trip_id: 'trip-123',
        has_dates: true,
        has_description: true,
        source: 'manual',
      })
    })
  })
})
```

---

### Event 4: `expense_added_nl` (~1.5 hours + 1.5 hours tests)

**File:** `apps/web/components/features/expenses/ExpenseInput.tsx`

**Location:** After successful NL expense parsing and creation

**Implementation:**

```typescript
import { posthog } from '@/lib/analytics/posthog'

// After successful expense creation via NL
const result = await createExpense(parsedExpenseData)

if (result.success) {
  posthog.capture('expense_added_nl', {
    trip_id: tripId,
    amount_cents: parsedExpenseData.amount,
    currency: parsedExpenseData.currency,
    split_type: parsedExpenseData.splitType,
    participant_count: parsedExpenseData.participants.length,
    parse_success: true,
    has_receipt: false, // Update when receipt upload implemented
  })
}
```

**Test File:** `apps/web/tests/unit/expenses/expense-input-analytics.test.tsx`

---

### Event 5: `expense_added_manual` (~1.5 hours + 1.5 hours tests)

**File:** `apps/web/components/features/expenses/ExpenseFormDialog.tsx`

**Location:** Line 308 (after successful manual expense creation)

**Implementation:**

```typescript
import { posthog } from '@/lib/analytics/posthog'

// In onSubmit function, after successful expense creation
const result = await createExpense(input)

if (!result.success) {
  throw new Error(result.error)
}

// Track manual expense creation
posthog.capture('expense_added_manual', {
  trip_id: tripId,
  amount_cents: amountInCents,
  currency: values.currency,
  split_type: splitType,
  participant_count: selectedParticipants.length,
  has_receipt: false, // Update when receipt upload implemented
})

toast({
  title: isEditMode ? 'Expense updated!' : 'Expense created!',
  description: `${values.description} has been ${isEditMode ? 'updated' : 'added'} successfully.`,
})
```

**Test File:** `apps/web/tests/unit/expenses/expense-form-analytics.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { posthog } from '@/lib/analytics/posthog'
import { ExpenseFormDialog } from '@/components/features/expenses/ExpenseFormDialog'

jest.mock('@/lib/analytics/posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}))

describe('ExpenseFormDialog Analytics', () => {
  it('captures expense_added_manual event', async () => {
    render(
      <ExpenseFormDialog
        open={true}
        onOpenChange={jest.fn()}
        tripId="trip-123"
        tripParticipants={[
          { id: 'user-1', name: 'Alice', avatar_url: null },
          { id: 'user-2', name: 'Bob', avatar_url: null },
        ]}
      />
    )

    // Fill form
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Dinner' },
    })
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '60' },
    })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create expense/i }))

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('expense_added_manual', {
        trip_id: 'trip-123',
        amount_cents: 6000,
        currency: 'EUR',
        split_type: 'equal',
        participant_count: 2,
        has_receipt: false,
      })
    })
  })
})
```

---

## Bonus: Fix `tour_dismissed` Bug (~15 minutes)

**File:** `apps/web/components/features/tour/Tour.tsx`

**Location:** Lines 128-131

**Current (BUGGY):**

```typescript
console.log('[Tour Analytics] tour_dismissed:', {
  tour_id: config.id,
  step: currentStepIndex,
})
```

**Fix:**

```typescript
posthog.capture('tour_dismissed', {
  tour_id: config.id,
  step: currentStepIndex,
})
```

---

## Testing Checklist

### Unit Tests

For each event, verify:

- [ ] Event captured with correct name
- [ ] Event properties match schema
- [ ] Event fires at correct time in lifecycle
- [ ] Event doesn't fire during SSR
- [ ] Event doesn't fire on error

### Manual Testing

1. **PostHog Debug Mode**

   ```typescript
   // In posthog-provider.tsx
   if (process.env.NODE_ENV === 'development') {
     posthog.debug()
   }
   ```

2. **Test Each Flow:**
   - [ ] Sign up with email
   - [ ] Sign up with Google
   - [ ] Log in with email
   - [ ] Log in with Google
   - [ ] Create trip (with dates)
   - [ ] Create trip (without dates)
   - [ ] Add expense via NL
   - [ ] Add expense via manual form

3. **Verify in PostHog:**
   - Open PostHog dashboard
   - Go to Activity → Events
   - Filter by event names
   - Verify properties are correct

---

## Success Criteria

✅ All 5 P0 events implemented
✅ All events have unit tests
✅ All tests pass (`npm test`)
✅ Events visible in PostHog dashboard (dev mode)
✅ Events fire correctly in manual testing
✅ `tour_dismissed` bug fixed
✅ No TypeScript errors
✅ No console errors in browser

---

## Time Breakdown

| Task                                 | Estimated Time   |
| ------------------------------------ | ---------------- |
| Install PostHog                      | 30 min           |
| Create provider                      | 30 min           |
| `signup` event + tests               | 2 hours          |
| `login` event + tests                | 2 hours          |
| `trip_created` event + tests         | 2 hours          |
| `expense_added_nl` event + tests     | 3 hours          |
| `expense_added_manual` event + tests | 3 hours          |
| Fix `tour_dismissed` bug             | 15 min           |
| Manual testing & verification        | 1 hour           |
| **TOTAL**                            | **~13-14 hours** |

---

## Next Steps After P0

Once P0 events are complete:

1. **Deploy to Staging**
   - Verify events in staging PostHog project
   - Monitor for 24-48 hours

2. **Create PostHog Dashboards**
   - User Acquisition funnel
   - Trip Creation funnel
   - Expense Tracking funnel

3. **Implement P1 Events** (within 1 month)
   - See [Priority Matrix](./ANALYTICS_EVENTS.md#event-priority-matrix)

4. **Monitor & Iterate**
   - Review funnel drop-offs weekly
   - Optimize based on data

---

## Resources

- **Schema Documentation:** [docs/ANALYTICS_EVENTS.md](./ANALYTICS_EVENTS.md)
- **PostHog Wrapper:** [apps/web/lib/analytics/posthog.ts](../apps/web/lib/analytics/posthog.ts)
- **Example Tests:**
  - [onboarding-analytics.test.tsx](../apps/web/tests/unit/onboarding/onboarding-analytics.test.tsx)
  - [tour-analytics.test.tsx](../apps/web/tests/unit/tour/tour-analytics.test.tsx)
- **PostHog Docs:** https://posthog.com/docs

---

**Last Updated:** November 28, 2025
**Status:** Ready for Implementation
