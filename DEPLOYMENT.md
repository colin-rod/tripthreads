# Deployment Guide

This guide covers deploying TripThreads to staging and production environments.

## 📋 Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [Vercel Deployment (Web)](#vercel-deployment-web)
- [Expo/EAS Deployment (Mobile)](#expoeas-deployment-mobile)
- [Supabase Setup](#supabase-setup)
- [Stripe Setup](#stripe-setup)
- [Monitoring Setup](#monitoring-setup)
- [Rollback Procedures](#rollback-procedures)

---

## Overview

### Environments

| Environment     | Web Hosting         | Mobile Builds               | Database            | Branch        |
| --------------- | ------------------- | --------------------------- | ------------------- | ------------- |
| **Development** | localhost:3000      | Expo Dev                    | Supabase Dev        | `feature/*`   |
| **Staging**     | dev.tripthreads.com | TestFlight/Internal Testing | Supabase Staging    | `development` |
| **Production**  | tripthreads.com     | App Store/Play Store        | Supabase Production | `main`        |

### Deployment Triggers

- **Feature branches** → Preview deployments (Vercel only)
- **`development` branch** → Auto-deploy to staging
- **`main` branch** → Auto-deploy to production (requires approval)

---

## Environment Variables

### Web (Next.js + Vercel)

#### Required for All Environments

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
```

#### Phase 2+ (Expense Tracking)

```bash
# FX Rates
FX_RATES_API_KEY=your_exchangerate_host_key
```

#### Phase 3+ (Payments)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx  # Use sk_live_xxx in production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # Use pk_live_xxx in production
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

#### Phase 4+ (Monitoring & Push)

```bash
# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
```

#### Linear Feedback Ingestion (Supabase Edge Function)

Configure these in Supabase project settings for the `submit-feedback` edge function:

```bash
LINEAR_API_KEY=<YOUR_LINEAR_API_KEY>
LINEAR_FEEDBACK_TEAM_ID=<LINEAR_TEAM_ID>
LINEAR_FEEDBACK_LABEL_ID=<LINEAR_LABEL_ID>
```

### Mobile (Expo + EAS)

#### app.json Configuration

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://xxx.supabase.co",
      "supabaseAnonKey": "<YOUR_SUPABASE_ANON_KEY>",
      "stripePublishableKey": "pk_test_xxx"
    }
  }
}
```

#### EAS Secrets (Sensitive Values)

Use EAS Secrets for production builds:

```bash
# Set secrets using EAS CLI
eas secret:create --scope project --name SUPABASE_ANON_KEY --value <YOUR_SUPABASE_ANON_KEY>
eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value pk_live_xxx

# Reference in app.json
{
  "expo": {
    "extra": {
      "supabaseAnonKey": process.env.SUPABASE_ANON_KEY,
      "stripePublishableKey": process.env.STRIPE_PUBLISHABLE_KEY
    }
  }
}
```

---

## Vercel Deployment (Web)

### Initial Setup

1. **Connect GitHub repository**

   ```bash
   # Go to https://vercel.com/new
   # Import your GitHub repository
   # Select tripthreads
   ```

2. **Configure project settings**
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install`

3. **Set environment variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables (see above)
   - Set appropriate scopes:
     - **Production:** Only for `main` branch
     - **Preview:** For `development` and feature branches
     - **Development:** For local development (optional)

4. **Configure domains**
   - **Production:** `tripthreads.com`
   - **Staging:** `dev.tripthreads.com`

### Deployment Workflow

#### Staging Deployment

```bash
# Merge to development branch
git checkout development
git merge feature/your-feature
git push origin development

# Vercel auto-deploys to dev.tripthreads.com
# Check deployment status at https://vercel.com/your-team/tripthreads
```

#### Production Deployment

```bash
# Create PR: development → main
gh pr create --base main --head development --title "Release: vX.X.X"

# After review and approval, merge to main
# Vercel auto-deploys to tripthreads.com
```

### Environment Variables per Environment

| Variable                   | Development   | Staging         | Production   |
| -------------------------- | ------------- | --------------- | ------------ |
| `NEXT_PUBLIC_SUPABASE_URL` | Dev project   | Staging project | Prod project |
| `STRIPE_SECRET_KEY`        | `sk_test_`    | `sk_test_`      | `sk_live_`   |
| `NODE_ENV`                 | `development` | `production`    | `production` |
| `SENTRY_DSN`               | Optional      | Required        | Required     |

---

## Expo/EAS Deployment (Mobile)

### Initial Setup

1. **Install EAS CLI**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**

   ```bash
   eas login
   ```

3. **Configure EAS**

   ```bash
   cd apps/mobile
   eas build:configure
   ```

4. **Set up build profiles** (eas.json)
   ```json
   {
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal",
         "channel": "preview"
       },
       "production": {
         "channel": "production"
       }
     }
   }
   ```

### Building for iOS

#### Development Build

```bash
cd apps/mobile
eas build --platform ios --profile development
```

#### TestFlight (Staging)

```bash
# Build for internal testing
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios --latest
```

#### App Store (Production)

```bash
# Build production release
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

### Building for Android

#### Development Build

```bash
cd apps/mobile
eas build --platform android --profile development
```

#### Internal Testing (Staging)

```bash
# Build for internal testing
eas build --platform android --profile preview

# Submit to Play Store Internal Testing
eas submit --platform android --latest
```

#### Play Store (Production)

```bash
# Build production release
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --latest
```

### Over-the-Air (OTA) Updates

```bash
# Publish update to staging
eas update --branch preview --message "Bug fixes"

# Publish update to production
eas update --branch production --message "New features"
```

---

## Supabase Setup

### Development Environment

```bash
# Start local Supabase
supabase start

# Get local credentials
supabase status

# Use local URL and keys in .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Staging Environment

1. Create new Supabase project: `tripthreads-staging`
2. Run migrations:
   ```bash
   supabase db push --project-ref xxx-staging
   ```
3. Set RLS policies
4. Upload seed data (optional)
5. Add credentials to Vercel staging environment

### Production Environment

1. Create new Supabase project: `tripthreads-production`
2. Run migrations:
   ```bash
   supabase db push --project-ref xxx-production
   ```
3. Set RLS policies
4. **Do NOT seed with fake data**
5. Add credentials to Vercel production environment
6. Enable Point-in-Time Recovery (PITR)
7. Set up automated backups

### Database Migrations

```bash
# Create new migration
supabase migration new your_migration_name

# Apply migrations locally
supabase db reset

# Push to remote (staging/production)
supabase db push --project-ref your-project-ref
```

---

## Stripe Setup

### Test Mode (Development & Staging)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle to **Test Mode**
3. Get test API keys from Developers → API keys
4. Set up test webhook:
   ```
   Endpoint URL: https://dev.tripthreads.com/api/webhooks/stripe
   Events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
   ```
5. Add webhook secret to Vercel staging environment

### Live Mode (Production)

1. Complete Stripe account verification
2. Toggle to **Live Mode**
3. Get live API keys
4. Set up live webhook:
   ```
   Endpoint URL: https://tripthreads.com/api/webhooks/stripe
   Events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
   ```
5. Add webhook secret to Vercel production environment

### Testing Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Monitoring Setup

### Sentry (Error Monitoring)

1. Create project: `tripthreads-web` and `tripthreads-mobile`
2. Get DSN from Project Settings
3. Add to environment variables:
   ```bash
   SENTRY_DSN=https://xxx@sentry.io/xxx
   SENTRY_AUTH_TOKEN=xxx  # For uploading source maps
   ```
4. Configure releases:
   ```bash
   # In package.json build script
   sentry-cli releases new $VERCEL_GIT_COMMIT_SHA
   sentry-cli releases files $VERCEL_GIT_COMMIT_SHA upload-sourcemaps .next
   sentry-cli releases finalize $VERCEL_GIT_COMMIT_SHA
   ```

### PostHog (Analytics)

1. Create project on [PostHog](https://posthog.com)
2. Get project API key
3. Add to environment variables:
   ```bash
   NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```
4. Enable session recording for production
5. Configure feature flags (optional)

---

## Rollback Procedures

### Web (Vercel)

#### Instant Rollback

1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "Promote to Production"
4. Done! Rollback is instant.

#### Git Rollback

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or rollback to specific commit
git reset --hard <commit-hash>
git push --force origin main  # Use with caution!
```

### Mobile (Expo)

#### OTA Rollback

```bash
# Republish previous working version
eas update --branch production --message "Rollback to previous version"
```

#### Binary Rollback

1. Go to App Store Connect / Play Console
2. Remove current version from sale
3. Re-release previous version
4. **Note:** This takes 24-48 hours for review

### Database (Supabase)

#### Point-in-Time Recovery

```bash
# Restore from backup (Supabase Dashboard)
# Go to Database → Backups → Restore
# Select restore point
# Confirm restoration
```

#### Manual Migration Rollback

```bash
# Create down migration
supabase migration new rollback_feature_name

# Write SQL to undo changes
# Apply migration
supabase db push --project-ref xxx
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass (`npm test`)
- [ ] Lint checks pass (`npm run lint`)
- [ ] Type checks pass (`npm run type-check`)
- [ ] Database migrations tested locally
- [ ] Environment variables set in Vercel/EAS
- [ ] Changelog updated
- [ ] Linear issues closed

### Post-Deployment

- [ ] Verify deployment URL loads
- [ ] Check Sentry for errors
- [ ] Test critical user flows (signup, login, create trip)
- [ ] Verify database connections
- [ ] Check Stripe webhooks (if applicable)
- [ ] Monitor PostHog for user activity
- [ ] Announce in team channel

---

## Troubleshooting

### Build Failures

**Vercel:**

- Check build logs in Vercel dashboard
- Verify environment variables are set
- Test build locally: `npm run build`

**EAS:**

- Check build logs: `eas build:list`
- Verify app.json configuration
- Test locally: `expo prebuild`

### Database Connection Issues

- Verify Supabase project is not paused (free tier)
- Check RLS policies are correct
- Verify API keys are correct
- Check database quota limits

### Stripe Webhook Failures

- Verify webhook endpoint URL is correct
- Check webhook secret matches
- Test with Stripe CLI locally
- Check Stripe dashboard webhook logs

---

## Security Checklist

- [ ] Service role keys are server-side only
- [ ] Production keys are different from test keys
- [ ] Secrets are stored in Vercel/EAS, not in code
- [ ] `.env.local` is in `.gitignore`
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled (Supabase/Stripe)
- [ ] RLS policies are enabled and tested
- [ ] HTTPS is enforced
- [ ] CSP headers are configured

---

## Support

For deployment issues:

- **Vercel:** https://vercel.com/support
- **Expo/EAS:** https://expo.dev/support
- **Supabase:** https://supabase.com/support
- **Stripe:** https://support.stripe.com

---

**Last Updated:** 2025-10-29
**Version:** 1.0
