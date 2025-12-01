# Stripe Integration Setup Guide

**Last Updated:** November 2025
**Phase:** 3 (Stripe Integration)
**Status:** ✅ Configuration Complete | 🚧 Checkout Implementation Pending

---

## Overview

This guide walks you through setting up Stripe for TripThreads Pro subscriptions with multi-currency support (EUR, USD, GBP). We use Stripe's **Adaptive Pricing** to automatically show customers prices in their local currency.

---

## Prerequisites

- Stripe account ([sign up here](https://dashboard.stripe.com/register))
- Access to Stripe Dashboard
- TripThreads repository cloned locally
- Supabase database set up

---

## Part 1: Stripe Dashboard Setup

### Step 1: Create Products in Stripe Dashboard

1. **Log in to Stripe Dashboard**
   Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)

2. **Switch to Test Mode**
   Toggle "Test mode" in the top-right corner (we'll set up production later)

3. **Navigate to Products**
   Click on **Products** in the left sidebar → **+ Add product**

---

### Product 1: TripThreads Pro (Monthly)

1. **Product Information**
   - **Name:** `TripThreads Pro (Monthly)`
   - **Description:** `Unlimited trips, participants, and photos. Cancel anytime.`
   - **Statement descriptor:** `TRIPTHREADS PRO` (appears on credit card statements)

2. **Pricing**
   - Click **+ Add another price**
   - **Pricing model:** Standard pricing
   - **Price:** See table below
   - **Billing period:** Recurring → Monthly
   - **Trial period:** None (leave unchecked for now)

   | Currency | Price | Display |
   | -------- | ----- | ------- |
   | EUR      | €7    | €7/mo   |
   | USD      | $8    | $8/mo   |
   | GBP      | £6    | £6/mo   |

3. **Add all three prices** (one for each currency)

4. **Save Product**

5. **Copy IDs**
   - Product ID (starts with `prod_`): Copy for `STRIPE_PRODUCT_PRO_MONTHLY`
   - Price IDs (start with `price_`): Copy each for:
     - `STRIPE_PRICE_MONTHLY_EUR`
     - `STRIPE_PRICE_MONTHLY_USD`
     - `STRIPE_PRICE_MONTHLY_GBP`

---

### Product 2: TripThreads Pro (Yearly)

1. **Product Information**
   - **Name:** `TripThreads Pro (Yearly)`
   - **Description:** `Unlimited trips, participants, and photos. Save 17% with annual billing.`
   - **Statement descriptor:** `TRIPTHREADS PRO`

2. **Pricing**

   | Currency | Price | Display | Monthly Equivalent |
   | -------- | ----- | ------- | ------------------ |
   | EUR      | €70   | €70/yr  | €5.83/mo           |
   | USD      | $80   | $80/yr  | $6.67/mo           |
   | GBP      | £60   | £60/yr  | £5.00/mo           |
   - **Billing period:** Recurring → Yearly

3. **Add all three prices**

4. **Copy IDs** for:
   - `STRIPE_PRODUCT_PRO_YEARLY`
   - `STRIPE_PRICE_YEARLY_EUR`
   - `STRIPE_PRICE_YEARLY_USD`
   - `STRIPE_PRICE_YEARLY_GBP`

---

### Product 3: TripThreads Pro (One-Time)

1. **Product Information**
   - **Name:** `TripThreads Pro (Single Month)`
   - **Description:** `Unlock Pro features for one month. Perfect for a single trip.`
   - **Statement descriptor:** `TRIPTHREADS PRO`

2. **Pricing**

   | Currency | Price | Display |
   | -------- | ----- | ------- |
   | EUR      | €9    | €9      |
   | USD      | $10   | $10     |
   | GBP      | £8    | £8      |
   - **Billing period:** One-time

3. **Add all three prices**

4. **Copy IDs** for:
   - `STRIPE_PRODUCT_PRO_ONEOFF`
   - `STRIPE_PRICE_ONEOFF_EUR`
   - `STRIPE_PRICE_ONEOFF_USD`
   - `STRIPE_PRICE_ONEOFF_GBP`

---

### Step 2: Get API Keys

1. **Navigate to Developers → API Keys**
   [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)

2. **Copy Keys**
   - **Publishable key** (starts with `pk_test_`): For `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (starts with `sk_test_`): For `STRIPE_SECRET_KEY`
     - Click "Reveal test key" to see the full key

---

## Part 2: Environment Configuration

### Step 1: Update `.env.local`

1. **Open `.env.local`** in the project root

2. **Add/Update Stripe Variables**

```bash
# ============================================================================
# STRIPE (Required for Pro tier payments - Phase 3)
# ============================================================================

# API Keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

# Webhook secret (we'll add this later in Part 4)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Product IDs
STRIPE_PRODUCT_PRO_MONTHLY=prod_YOUR_MONTHLY_PRODUCT_ID
STRIPE_PRODUCT_PRO_YEARLY=prod_YOUR_YEARLY_PRODUCT_ID
STRIPE_PRODUCT_PRO_ONEOFF=prod_YOUR_ONEOFF_PRODUCT_ID

# Price IDs - EUR
STRIPE_PRICE_MONTHLY_EUR=price_YOUR_EUR_MONTHLY_PRICE_ID
STRIPE_PRICE_YEARLY_EUR=price_YOUR_EUR_YEARLY_PRICE_ID
STRIPE_PRICE_ONEOFF_EUR=price_YOUR_EUR_ONEOFF_PRICE_ID

# Price IDs - USD
STRIPE_PRICE_MONTHLY_USD=price_YOUR_USD_MONTHLY_PRICE_ID
STRIPE_PRICE_YEARLY_USD=price_YOUR_USD_YEARLY_PRICE_ID
STRIPE_PRICE_ONEOFF_USD=price_YOUR_USD_ONEOFF_PRICE_ID

# Price IDs - GBP
STRIPE_PRICE_MONTHLY_GBP=price_YOUR_GBP_MONTHLY_PRICE_ID
STRIPE_PRICE_YEARLY_GBP=price_YOUR_GBP_YEARLY_PRICE_ID
STRIPE_PRICE_ONEOFF_GBP=price_YOUR_GBP_ONEOFF_PRICE_ID
```

3. **Save the file**

**⚠️ IMPORTANT:** Never commit `.env.local` to git! It's already in `.gitignore`.

---

## Part 3: Database Migration

### Step 1: Apply Migration

The migration adds two columns to the `users` table:

- `subscription_currency` - User's subscription currency (EUR, USD, GBP)
- `subscription_price_id` - Stripe Price ID for webhook reconciliation

**Run migration:**

```bash
# From project root
supabase db push
```

**Expected output:**

```
Applying migration 20251111000001_add_subscription_fields.sql...
Migration applied successfully
```

### Step 2: Verify Migration

```bash
# Check that columns were added
supabase db diff
```

Or check in Supabase Dashboard → Table Editor → `users` table

---

## Part 4: Testing Stripe Integration

### Step 1: Validate Configuration

Create a simple test script or API route:

```typescript
// apps/web/app/api/test-stripe/route.ts
import { NextResponse } from 'next/server'
import { validateStripeConfig } from '@/lib/stripe/config'
import { validateStripeEnvironment } from '@/lib/stripe/client'

export async function GET() {
  try {
    // Validate config
    validateStripeConfig()
    validateStripeEnvironment()

    return NextResponse.json({
      success: true,
      message: 'Stripe configuration is valid',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

**Test the endpoint:**

```bash
curl http://localhost:3000/api/test-stripe
```

### Step 2: Test Stripe SDK Initialization

```typescript
import { getStripe } from '@/lib/stripe/client'

// This should not throw an error
const stripe = getStripe()
console.log('Stripe initialized:', stripe)
```

---

## Part 5: Stripe Test Cards

Use these test card numbers during development:

| Card Number         | Use Case                      |
| ------------------- | ----------------------------- |
| 4242 4242 4242 4242 | Successful payment            |
| 4000 0025 0000 3155 | Requires 3D Secure (SCA)      |
| 4000 0000 0000 9995 | Declined (insufficient funds) |
| 4000 0000 0000 0002 | Declined (generic)            |

**Card details:**

- **Expiry:** Any future date (e.g., 12/34)
- **CVC:** Any 3 digits (e.g., 123)
- **ZIP:** Any 5 digits (e.g., 12345)

See full list: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

---

## Part 6: Webhooks Setup (Phase 3+)

Webhooks are needed to handle subscription lifecycle events (activated, canceled, expired, etc.).

**Note:** This will be implemented in a future issue. For now, webhooks are optional for testing the products/config setup.

### Development Webhooks (Future)

1. **Install Stripe CLI**
   [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

2. **Forward webhooks to local server**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. **Copy webhook signing secret**
   Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### Production Webhooks (Future)

1. **Navigate to Developers → Webhooks**
   [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)

2. **Add endpoint**
   URL: `https://tripthreads.com/api/webhooks/stripe`

3. **Select events to listen to:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. **Copy webhook signing secret**
   Add to production environment variables

---

## Part 7: Production Setup

When ready to deploy to production:

### Step 1: Create Production Products

1. **Switch to Live Mode** in Stripe Dashboard
2. **Repeat Part 1** to create products in live mode
3. **Copy production Product IDs and Price IDs**

### Step 2: Update Production Environment Variables

In Vercel (or your hosting platform):

1. **Navigate to Settings → Environment Variables**
2. **Add all Stripe variables** with production values:
   - Use `sk_live_` and `pk_live_` keys
   - Use production Product/Price IDs (start with `prod_` and `price_`)

### Step 3: Test Production Checkout

1. **Use real card** or Stripe test mode
2. **Verify subscriptions** appear in Stripe Dashboard → Customers
3. **Check database** for updated `plan` and `plan_expires_at`

---

## Architecture Overview

### File Structure

```
apps/web/lib/stripe/
├── config.ts           # Product/price configuration, feature limits
├── client.ts           # Stripe SDK initialization (server + client)
└── utils.ts            # Helper functions (formatting, plan checks)

apps/web/app/api/
├── create-checkout/    # Create Stripe Checkout session (Phase 3+)
└── webhooks/stripe/    # Handle Stripe webhooks (Phase 3+)

supabase/migrations/
└── 20251111000001_add_subscription_fields.sql
```

### How Adaptive Pricing Works

1. **Customer visits pricing page**
   Client-side detects locale (`navigator.language`)

2. **Display local currency**
   Use `detectCurrency()` from `lib/stripe/utils.ts` to show EUR/USD/GBP

3. **Customer clicks "Subscribe"**
   Create Checkout Session with **all price IDs** for the product

4. **Stripe auto-detects currency**
   Stripe uses customer's IP/card country to show correct price

5. **Customer completes checkout**
   Webhook updates database with `subscription_currency` and `subscription_price_id`

---

## Troubleshooting

### Error: "Missing required Stripe environment variables"

**Cause:** Environment variables not set correctly

**Solution:**

1. Check `.env.local` has all 15 Stripe variables
2. Restart dev server: `npm run dev`
3. Run validation: `curl http://localhost:3000/api/test-stripe`

### Error: "Invalid API Key"

**Cause:** Using live key in test mode (or vice versa)

**Solution:**

- Test mode: Use `sk_test_` and `pk_test_`
- Live mode: Use `sk_live_` and `pk_live_`

### Products not visible in dashboard

**Cause:** Wrong Stripe mode (test vs live)

**Solution:**

- Toggle "Test mode" switch in top-right corner
- Ensure you're viewing the correct mode

### TypeScript errors in Stripe files

**Cause:** Stripe packages not installed or types not generated

**Solution:**

```bash
npm install stripe @stripe/stripe-js
npm run type-check
```

---

## Next Steps

After completing this setup:

1. ✅ **Products configured in Stripe** (this guide)
2. 🚧 **Create Checkout flow** (next issue)
3. 🚧 **Implement webhooks** (future issue)
4. 🚧 **Build subscription management UI** (future issue)
5. 🚧 **Enforce Pro tier limits** (future issue)

---

## Reference Links

- **Stripe Dashboard:** [https://dashboard.stripe.com](https://dashboard.stripe.com)
- **Stripe API Docs:** [https://stripe.com/docs/api](https://stripe.com/docs/api)
- **Stripe Testing:** [https://stripe.com/docs/testing](https://stripe.com/docs/testing)
- **Stripe Checkout:** [https://stripe.com/docs/payments/checkout](https://stripe.com/docs/payments/checkout)
- **Adaptive Pricing:** [https://stripe.com/docs/payments/checkout/pricing-table#adaptive-pricing](https://stripe.com/docs/payments/checkout/pricing-table#adaptive-pricing)

---

**For more documentation:**

- [CLAUDE.md](../CLAUDE.md) - Main project documentation
- [DATABASE.md](DATABASE.md) - Database schema
- [CICD.md](CICD.md) - Deployment pipeline
