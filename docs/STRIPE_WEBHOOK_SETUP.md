# Stripe Webhook Configuration Guide

**Phase:** 3.3 (Stripe Webhooks)
**Created:** 2025-01-27
**Status:** Ready for configuration

## Overview

This guide explains how to configure Stripe webhooks to connect your Stripe account to the `/api/webhooks/stripe` endpoint. Webhooks are required for automatic subscription lifecycle management.

## Prerequisites

- ✅ Stripe account created (test mode)
- ✅ Products and prices configured in Stripe Dashboard
- ✅ Webhook endpoint implemented (`/api/webhooks/stripe`)
- 📋 Application deployed to staging or production

## Webhook Endpoint

**Local Development:**

```
http://localhost:3000/api/webhooks/stripe
```

**Staging (when deployed):**

```
https://dev.tripthreads.com/api/webhooks/stripe
```

**Production (when deployed):**

```
https://tripthreads.com/api/webhooks/stripe
```

## Step-by-Step Setup

### 1. Navigate to Webhooks in Stripe Dashboard

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Ensure you're in **Test Mode** (toggle in top right)
3. Click **Developers** → **Webhooks**
4. Click **+ Add endpoint**

### 2. Configure Endpoint

**Endpoint URL:** Enter your application URL + `/api/webhooks/stripe`

- For local testing: Use [Stripe CLI](#local-testing-with-stripe-cli) instead
- For staging: `https://dev.tripthreads.com/api/webhooks/stripe`
- For production: `https://tripthreads.com/api/webhooks/stripe`

**Description:** (optional)

```
TripThreads subscription lifecycle events
```

### 3. Select Events to Listen To

Select the following 4 events (required for Phase 3.3):

- ✅ `checkout.session.completed` - When payment succeeds
- ✅ `customer.subscription.updated` - When subscription renews or is canceled
- ✅ `customer.subscription.deleted` - When subscription is permanently deleted
- ✅ `invoice.payment_failed` - When payment fails

**Why these events?**

- `checkout.session.completed`: Upgrades user to Pro immediately after successful payment
- `customer.subscription.updated`: Updates plan expiry date on renewal, handles cancellations
- `customer.subscription.deleted`: Downgrades user to Free when subscription ends
- `invoice.payment_failed`: Logs failures for monitoring (Stripe retries automatically)

### 4. Copy Webhook Signing Secret

After creating the endpoint, Stripe will show you a **signing secret** that starts with `whsec_`.

**Example:**

```
whsec_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
```

### 5. Update Environment Variables

Add the signing secret to your `.env.local` file:

```bash
# Replace the placeholder with the actual signing secret
STRIPE_WEBHOOK_SECRET=whsec_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
```

**⚠️ IMPORTANT:**

- Never commit the real webhook secret to git
- Use different secrets for test and live mode
- Rotate secrets if compromised

### 6. Restart Your Application

After updating `.env.local`, restart your development server:

```bash
npm run dev
```

### 7. Test the Webhook

#### Option A: Using Stripe Dashboard

1. Go to **Webhooks** → Click your endpoint
2. Click **Send test webhook**
3. Select `checkout.session.completed`
4. Click **Send test webhook**
5. Check the **Response** tab to verify 200 status

#### Option B: Using Stripe CLI (Recommended for Local)

See [Local Testing with Stripe CLI](#local-testing-with-stripe-cli) below.

## Local Testing with Stripe CLI

For local development, use the Stripe CLI to forward webhook events to your local server.

### 1. Install Stripe CLI

**macOS (Homebrew):**

```bash
brew install stripe/stripe-cli/stripe
```

**Other platforms:** [Download from Stripe](https://stripe.com/docs/stripe-cli#install)

### 2. Authenticate

```bash
stripe login
```

This will open your browser to authenticate with Stripe.

### 3. Forward Webhooks to Local Server

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

**Output:**

```
> Ready! You are using Stripe API Version [2025-12-15]. Your webhook signing secret is whsec_xxx (^C to quit)
```

**Copy the `whsec_xxx` signing secret** and add it to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 4. Trigger Test Events

In a separate terminal, trigger test events:

```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription update
stripe trigger customer.subscription.updated

# Test subscription deletion
stripe trigger customer.subscription.deleted

# Test payment failure
stripe trigger invoice.payment_failed
```

### 5. Monitor Webhook Events

Watch your terminal where `stripe listen` is running to see webhook events being forwarded.

## Verification Checklist

After configuration, verify everything works:

- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] 4 events selected (checkout, subscription updated/deleted, payment failed)
- [ ] Signing secret added to `.env.local`
- [ ] Application restarted
- [ ] Test event sent successfully
- [ ] Response shows 200 status
- [ ] No errors in application logs
- [ ] User upgraded to Pro in database after test checkout

## Troubleshooting

### Webhook Returns 400 "Invalid signature"

**Cause:** Webhook secret mismatch

**Fix:**

1. Copy the signing secret from Stripe Dashboard (or Stripe CLI output)
2. Update `STRIPE_WEBHOOK_SECRET` in `.env.local`
3. Restart your application
4. Ensure the secret starts with `whsec_`

### Webhook Returns 500 "Failed to update user plan"

**Cause:** Database error or missing user

**Fix:**

1. Check application logs for detailed error
2. Verify user exists in database
3. Check `metadata.userId` is set in checkout session
4. Verify Supabase connection is working

### Events Not Being Received

**Cause:** Endpoint URL incorrect or firewall blocking

**Fix:**

1. Verify endpoint URL is publicly accessible
2. Check Stripe Dashboard → Webhooks → Click endpoint → View logs
3. For local development, use Stripe CLI instead
4. Check firewall/network rules

### "Webhook secret is placeholder" Warning

**Cause:** Using default placeholder value

**Fix:**

1. Go to Stripe Dashboard → Webhooks
2. Create endpoint and copy real signing secret
3. Update `STRIPE_WEBHOOK_SECRET` in `.env.local`
4. Restart application

## Security Considerations

1. **Signature Verification:** Every webhook is verified using `verifyWebhookSignature()` before processing
2. **HTTPS Only:** In production, only use HTTPS endpoints
3. **Secret Rotation:** Rotate webhook secrets if compromised
4. **Rate Limiting:** Webhook endpoint is protected by application-level rate limiting
5. **Error Logging:** All webhook errors are logged to Sentry for monitoring

## Event Handling Details

### checkout.session.completed

**Triggers:** User completes payment at Stripe Checkout
**Action:**

- **Subscription:** Upgrades user to Pro, stores `stripe_subscription_id`
- **One-time:** Upgrades user to Pro, sets `plan_expires_at` to +30 days

**Database Updates:**

```sql
UPDATE profiles SET
  plan = 'pro',
  stripe_customer_id = 'cus_xxx',
  stripe_subscription_id = 'sub_xxx' OR NULL,
  subscription_price_id = 'price_xxx',
  plan_expires_at = NOW() + INTERVAL '30 days' OR NULL
WHERE id = 'user-123'
```

### customer.subscription.updated

**Triggers:** Subscription renews, canceled, or modified
**Action:**

- **Active:** Updates `plan_expires_at` to `current_period_end`
- **Canceled:** Downgrades to Free immediately

**Database Updates:**

```sql
-- For active subscriptions
UPDATE profiles SET
  plan_expires_at = '2026-02-27T00:00:00Z'
WHERE id = 'user-123'

-- For canceled subscriptions
UPDATE profiles SET
  plan = 'free',
  plan_expires_at = NULL
WHERE id = 'user-123'
```

### customer.subscription.deleted

**Triggers:** Subscription permanently deleted (after grace period)
**Action:** Downgrades user to Free, clears subscription data

**Database Updates:**

```sql
UPDATE profiles SET
  plan = 'free',
  plan_expires_at = NULL,
  stripe_subscription_id = NULL
WHERE id = 'user-123'
```

### invoice.payment_failed

**Triggers:** Recurring payment fails
**Action:** Logs warning to Sentry, no immediate downgrade

**Notes:**

- Stripe retries failed payments automatically (up to 4 times)
- User remains Pro during retry period
- If all retries fail, Stripe sends `customer.subscription.deleted`

## Production Deployment Checklist

Before deploying to production:

- [ ] Test all 4 webhook events in staging
- [ ] Verify database updates work correctly
- [ ] Configure webhook endpoint with production URL
- [ ] Use **live mode** signing secret (not test mode)
- [ ] Enable Sentry monitoring
- [ ] Set up alerts for webhook failures
- [ ] Document incident response procedures
- [ ] Test with real payment (small amount)

## Next Steps

After webhook configuration:

1. **Phase 3.4:** Implement Stripe Customer Portal for self-service billing
2. **Monitor:** Watch Sentry for webhook errors
3. **Test:** Process a real subscription in test mode
4. **Document:** Update runbooks with webhook troubleshooting steps

## References

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

---

**Last Updated:** 2025-01-27
**Phase:** 3.3 (Stripe Webhooks)
**Status:** Ready for configuration
