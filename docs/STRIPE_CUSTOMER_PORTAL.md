# Stripe Customer Portal Integration Guide

**Phase:** 3.4 (Stripe Customer Portal)
**Created:** 2025-01-27
**Status:** Production ready

## Overview

This guide explains the Stripe Customer Portal integration that allows Pro users to self-manage their subscriptions. The portal is a Stripe-hosted interface where users can update payment methods, view billing history, cancel subscriptions, and download invoices.

## Prerequisites

- ✅ Stripe account configured (Phase 3.1)
- ✅ Webhook endpoint implemented (Phase 3.3)
- ✅ User has active Pro subscription with `stripe_customer_id`
- ✅ Stripe Customer Portal configured in Dashboard

## Architecture

### Endpoint: `/api/create-portal-session`

**Method:** POST
**Authentication:** Required (user must be logged in)
**Authorization:** User must have `stripe_customer_id` and `plan: 'pro'`

**Response:**

```json
{
  "url": "https://billing.stripe.com/session/live_xxx"
}
```

### User Flow

1. **User clicks "Manage Subscription"** button in Settings → Subscription section
2. **Frontend calls** `/api/create-portal-session`
3. **Backend validates:**
   - User is authenticated
   - User has Stripe customer ID
   - User is on Pro plan
4. **Backend creates** Stripe billing portal session with return URL
5. **User redirects** to Stripe-hosted portal
6. **User manages subscription** (update payment, cancel, etc.)
7. **User returns** to Settings page via return URL
8. **Webhooks update** user profile based on changes

## Implementation Details

### API Endpoint: `/apps/web/app/api/create-portal-session/route.ts`

**Key Functions:**

1. **Authentication Check:**

```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser()

if (authError || !user) {
  return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
}
```

2. **User Validation:**

```typescript
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, stripe_customer_id, plan')
  .eq('id', user.id)
  .single()

if (!profile.stripe_customer_id || profile.plan !== 'pro') {
  return NextResponse.json(
    { error: 'No active subscription found. Please subscribe to Pro first.' },
    { status: 400 }
  )
}
```

3. **Portal Session Creation:**

```typescript
const stripe = getStripe()
const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=subscription`

const portalSession = await stripe.billingPortal.sessions.create({
  customer: profile.stripe_customer_id,
  return_url: returnUrl,
})

return NextResponse.json({ url: portalSession.url })
```

### UI Component: `/apps/web/components/features/profile/SubscriptionSection.tsx`

**Manage Subscription Handler:**

```typescript
const handleManageSubscription = async () => {
  try {
    setIsPortalLoading(true)

    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to open billing portal')
    }

    // Redirect to Stripe Customer Portal
    window.location.href = data.url
  } catch (error) {
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to open billing portal',
      variant: 'destructive',
    })
  } finally {
    setIsPortalLoading(false)
  }
}
```

**Button Rendering:**

```tsx
<Button
  variant="outline"
  className="w-full"
  onClick={handleManageSubscription}
  disabled={isPortalLoading}
>
  {isPortalLoading ? 'Loading...' : 'Manage Subscription'}
</Button>
```

## Stripe Dashboard Configuration

### Step 1: Navigate to Customer Portal Settings

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Ensure you're in **Test Mode** (toggle in top right)
3. Click **Settings** → **Billing** → **Customer portal**

### Step 2: Configure Portal Features

**Enable the following features:**

- ✅ **Update payment method** - Allow users to change credit cards
- ✅ **View invoice history** - Display past invoices
- ✅ **Cancel subscription** - Allow users to cancel
- ✅ **Pause subscription** (optional) - Allow temporary suspension

**Cancellation behavior:**

- **Immediately:** Subscription ends right away (choose this for test mode)
- **At period end:** Subscription remains active until expiry (recommended for production)

### Step 3: Customize Branding (Optional)

- Upload logo
- Set brand colors
- Customize success/cancellation messages

### Step 4: Save Configuration

Click **Save changes** to apply settings.

## Testing

### Unit Tests: `/apps/web/app/api/create-portal-session/route.test.ts`

**7 Test Cases:**

1. ✅ Returns 401 when user is not authenticated
2. ✅ Returns 400 when user has no Stripe customer ID
3. ✅ Returns 400 when user is not on Pro plan
4. ✅ Creates portal session for Pro user with valid Stripe customer ID
5. ✅ Uses correct return URL with `NEXT_PUBLIC_APP_URL`
6. ✅ Handles database error when fetching user profile
7. ✅ Handles Stripe API error when creating portal session

**Run tests:**

```bash
npm test -- apps/web/app/api/create-portal-session/route.test.ts
```

### Manual Testing

**Scenario 1: Pro User Accesses Portal**

1. Log in as Pro user
2. Navigate to Settings → Subscription
3. Click "Manage Subscription"
4. Verify redirect to Stripe portal
5. Verify return URL redirects to Settings

**Scenario 2: Free User Attempts Access**

1. Log in as Free user
2. Navigate to Settings → Subscription
3. Verify "Manage Subscription" button is NOT visible
4. (If manually calling API) Verify 400 error response

**Scenario 3: Update Payment Method**

1. Access portal as Pro user
2. Click "Update payment method"
3. Enter test card: `4242 4242 4242 4242`
4. Save changes
5. Verify success message
6. Return to app

**Scenario 4: Cancel Subscription**

1. Access portal as Pro user
2. Click "Cancel subscription"
3. Confirm cancellation
4. Verify webhook updates user to `plan: 'free'`
5. Verify Settings page shows Free plan

## Security Considerations

1. **Authentication Required:** Only authenticated users can access portal
2. **Authorization Enforced:** User must have `stripe_customer_id` and `plan: 'pro'`
3. **HTTPS Only:** Portal URLs use HTTPS in production
4. **Return URL Validation:** Stripe validates return URL against Dashboard settings
5. **Session Expiry:** Portal sessions expire after 1 hour (Stripe default)
6. **Error Logging:** All errors logged to Sentry with context

## Error Handling

### Common Errors

**Error:** `User not authenticated`

- **Status:** 401
- **Cause:** No auth session found
- **Fix:** Redirect to login page

**Error:** `No active subscription found`

- **Status:** 400
- **Cause:** User has no `stripe_customer_id` or is not on Pro plan
- **Fix:** User must subscribe to Pro first

**Error:** `Failed to create portal session`

- **Status:** 500
- **Cause:** Stripe API error or database error
- **Fix:** Check Stripe API keys, check Supabase connection, check logs

### User Feedback

All errors display user-friendly toast messages via `useToast()`:

```typescript
toast({
  title: 'Error',
  description: 'Failed to open billing portal. Please try again.',
  variant: 'destructive',
})
```

## Environment Variables

**Required:**

- `STRIPE_SECRET_KEY` - Stripe secret key (server-side)
- `NEXT_PUBLIC_APP_URL` - Application base URL for return URL
  - Local: `http://localhost:3000`
  - Staging: `https://dev.tripthreads.app`
  - Production: `https://tripthreads.app`

## Return URL Behavior

**Return URL format:**

```
{NEXT_PUBLIC_APP_URL}/settings?tab=subscription
```

**Examples:**

- Local: `http://localhost:3000/settings?tab=subscription`
- Staging: `https://dev.tripthreads.app/settings?tab=subscription`
- Production: `https://tripthreads.app/settings?tab=subscription`

The `?tab=subscription` query parameter ensures the Subscription tab is active when the user returns.

## Integration with Webhooks

When users make changes in the Customer Portal, Stripe sends webhook events to `/api/webhooks/stripe`:

| User Action                         | Webhook Event                                                 | Database Update                                |
| ----------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Cancel subscription (immediate)     | `customer.subscription.deleted`                               | `plan: 'free'`, clear `stripe_subscription_id` |
| Cancel subscription (at period end) | `customer.subscription.updated` (status: `canceled`)          | `plan: 'free'`, clear `plan_expires_at`        |
| Resume subscription                 | `customer.subscription.updated` (status: `active`)            | Restore `plan_expires_at`                      |
| Update payment method               | `customer.updated`                                            | No database change                             |
| Renewal (auto-charge)               | `customer.subscription.updated` + `invoice.payment_succeeded` | Update `plan_expires_at`                       |

See [docs/STRIPE_WEBHOOK_SETUP.md](STRIPE_WEBHOOK_SETUP.md) for webhook details.

## Production Deployment Checklist

Before deploying to production:

- [ ] Customer Portal configured in **live mode** Stripe Dashboard
- [ ] Return URL set to production domain (`https://tripthreads.app/settings?tab=subscription`)
- [ ] Cancellation policy configured (immediate vs. at period end)
- [ ] Branding customized (logo, colors)
- [ ] All 7 tests passing
- [ ] Manual testing completed in live mode
- [ ] Webhook endpoint verified in production
- [ ] Sentry monitoring enabled

## User Experience Flow

**For Pro Users:**

1. User navigates to Settings → Subscription
2. Sees active subscription status with expiry date
3. Clicks "Manage Subscription" button
4. Redirects to Stripe-hosted portal
5. Can:
   - Update payment method
   - View billing history
   - Download invoices
   - Cancel subscription
6. Returns to Settings page after making changes
7. Sees updated subscription status

**For Free Users:**

1. User navigates to Settings → Subscription
2. Sees Free plan status
3. Sees upgrade options (Monthly, Yearly, One-off)
4. No "Manage Subscription" button visible
5. Can click "Upgrade to Pro" to start checkout

## Next Steps

**Phase 3 Complete!** With Customer Portal implemented, all Stripe integration phases are done:

- ✅ Phase 3.1: Products, Prices, Config
- ✅ Phase 3.2: Stripe Checkout
- ✅ Phase 3.3: Stripe Webhooks
- ✅ Phase 3.4: Customer Portal

**Phase 4:** Push Notifications & Launch Prep (Next)

## References

- [Stripe Customer Portal Documentation](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Portal API Reference](https://stripe.com/docs/api/customer_portal)
- [Stripe Billing Best Practices](https://stripe.com/docs/billing/subscriptions/build-subscriptions)

---

**Last Updated:** 2025-01-27
**Phase:** 3.4 (Stripe Customer Portal)
**Status:** Production ready
