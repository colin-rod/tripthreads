# CI/CD Pipeline & Deployment

**Last Updated:** November 2025
**Status:** ✅ Phase 1-2 Implemented | 🚧 Ongoing

---

## Overview

TripThreads uses a multi-stage deployment pipeline with automated testing, type checking, and deployment to staging and production environments.

---

## Pipeline Architecture

```
┌─────────────────┐
│  Feature Branch │
│  (development)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CI Pipeline    │
│  - Lint         │
│  - Type Check   │
│  - Unit Tests   │
│  - Build Check  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto Deploy    │
│  to Staging     │
│  (Vercel)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Manual QA      │
│  & Approval     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PR to main     │
│  (production)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CI + E2E Tests │
│  (Full Suite)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy to Prod │
│  (tripthreads.  │
│   com)          │
└─────────────────┘
```

---

## GitHub Actions Workflows

### Main CI Pipeline

**File:** `.github/workflows/ci.yml`

**Triggers:**
- ✅ Push to any branch
- ✅ Pull requests to `development` or `main`
- ✅ Manual workflow dispatch

**Jobs:**

#### 1. Lint

```yaml
- name: Lint
  run: npm run lint
```

**Checks:**
- ESLint violations (errors & warnings)
- Code style consistency
- Import organization

**Status:** ✅ Implemented

---

#### 2. Type Check

```yaml
- name: Type Check
  run: npm run type-check
```

**Checks:**
- TypeScript compilation errors
- Type inference issues
- Missing type definitions

**Status:** ✅ Implemented

---

#### 3. Unit & Component Tests

```yaml
- name: Run Tests
  run: npm test -- --coverage --silent
```

**Checks:**
- All unit tests pass
- All component tests pass
- Coverage meets minimums (informational)

**Status:** ✅ Implemented

---

#### 4. Build Validation

```yaml
- name: Build
  run: npm run build
```

**Checks:**
- Next.js builds successfully
- No build-time errors
- Bundle size within limits (informational)

**Status:** ✅ Implemented

---

#### 5. E2E Tests (PR to main only)

```yaml
- name: E2E Tests
  if: github.base_ref == 'main'
  run: |
    cd apps/web
    npm run test:e2e
```

**Checks:**
- Critical user flows work end-to-end
- Integration with Supabase
- Authentication flows

**Status:** ✅ Implemented (runs on PR to main)

---

### Type Generation Workflow

**File:** `.github/workflows/generate-types.yml`

**Triggers:**
- Push to `main` or `development` (migration files modified)
- Pull requests modifying `supabase/migrations/*.sql`

**Jobs:**

```yaml
- name: Generate Supabase Types
  run: |
    supabase start
    npm run generate-types
    git add packages/core/src/types/database.ts
    git commit -m "chore(types): regenerate Supabase types"
    git push
```

**Status:** ✅ Implemented

See [SUPABASE_TYPES_GENERATION.md](SUPABASE_TYPES_GENERATION.md) for details.

---

## Deployment Environments

### Development Environment

**URL:** N/A (local only)

**Branch:** Any feature branch

**Deployment:** Manual (`npm run dev`)

**Database:** Local Supabase instance

**Purpose:**
- Local development and testing
- Quick iterations
- Debug and troubleshooting

---

### Staging Environment

**URL:** `dev.tripthreads.com` 📋 (Not yet configured)

**Branch:** `development`

**Deployment:** Auto-deploy via Vercel on push to `development`

**Database:** Supabase staging project

**Purpose:**
- Integration testing
- QA and user acceptance testing
- Performance testing
- Demo to stakeholders

**Status:** 🚧 Partially configured (Vercel connected, URL TBD)

---

### Production Environment

**URL:** `tripthreads.com` 📋 (Not yet live)

**Branch:** `main`

**Deployment:** Auto-deploy via Vercel on merge to `main`

**Database:** Supabase production project

**Purpose:**
- Live user traffic
- Revenue-generating environment
- Monitored 24/7

**Status:** 🚧 Infrastructure ready, pending go-live

---

## Vercel Deployment (Web)

### Configuration

**File:** `vercel.json` (implicit, using defaults)

**Build Settings:**
- Framework: Next.js
- Build command: `npm run build` (from root via Turborepo)
- Output directory: `apps/web/.next`
- Install command: `npm install`

### Branch Deployment Strategy

| Branch | Environment | URL | Auto-Deploy |
|--------|-------------|-----|-------------|
| `main` | Production | `tripthreads.com` | ✅ Yes |
| `development` | Staging | `dev.tripthreads.com` | ✅ Yes |
| `feature/*` | Preview | `[branch]-tripthreads.vercel.app` | ✅ Yes |

### Environment Variables

**Required in Vercel:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY> # Server-side only

# OpenAI (for AI chat assistant)
OPENAI_API_KEY=sk-xxx

# Stripe (Phase 3)
STRIPE_SECRET_KEY=sk_live_xxx # Production
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Analytics & Monitoring
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx # For source maps
SENTRY_ORG=your-org
SENTRY_PROJECT=tripthreads-web

# Push Notifications (Phase 4)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx # Server-side only
```

**Setting Variables:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable with appropriate scope (Production, Preview, Development)
3. Redeploy if needed

### Deployment Workflow

1. **Push to branch:**
   ```bash
   git push origin feature/my-feature
   ```

2. **Vercel detects push:**
   - Triggers build automatically
   - Runs CI checks in parallel

3. **Preview deployment:**
   - Generated URL: `feature-my-feature-tripthreads.vercel.app`
   - Available immediately after build
   - Shareable link for review

4. **Merge to development:**
   - Auto-deploys to staging (`dev.tripthreads.com`)
   - Runs full test suite

5. **Merge to main:**
   - Runs E2E tests in CI
   - Auto-deploys to production (`tripthreads.com`)
   - Sentry release tracking enabled

### Rollback Strategy

**Option 1: Vercel Dashboard**
1. Go to Deployments tab
2. Find last known good deployment
3. Click "Promote to Production"
4. Instant rollback (no rebuild)

**Option 2: Git Revert**
```bash
git revert <bad-commit-sha>
git push origin main
# Triggers new deployment
```

---

## Expo/EAS Deployment (Mobile)

### Configuration

**File:** `apps/mobile/eas.json`

**Build Profiles:**

```json
{
  "build": {
    "development": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### Build Strategy

| Profile | Purpose | Distribution |
|---------|---------|--------------|
| `development` | Local testing | Simulator/Emulator |
| `preview` | Internal testing | TestFlight, Internal Testing |
| `production` | App Store release | App Store, Play Store |

### Manual Builds

```bash
cd apps/mobile

# Development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Production build (app stores)
eas build --profile production --platform ios
eas build --profile production --platform android
```

### Automated Builds (Phase 3)

📋 **Planned:** GitHub Action to trigger EAS builds on release tags

```yaml
# .github/workflows/mobile-release.yml
name: Mobile Release

on:
  push:
    tags:
      - 'mobile-v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive

      - name: Build Android
        run: eas build --platform android --profile production --non-interactive
```

**Status:** 📋 Not yet implemented

---

## Database Migrations

### Staging Deployment

**Process:**
1. Migrations applied automatically via `supabase db push --linked` in CI
2. Staging database updated before app deployment
3. Rollback available via rollback migration files

**Command (in CI):**
```bash
supabase link --project-ref $SUPABASE_STAGING_REF
supabase db push --linked
```

### Production Deployment

**Process:**
1. ⚠️ **Manual approval required** for production migrations
2. Run migration via Supabase Dashboard SQL Editor
3. Verify in Table Editor before deploying app
4. Coordinate with app deployment (may require maintenance window)

**Safeguards:**
- All migrations tested in staging first
- Rollback migrations prepared
- Database backups verified before deployment
- On-call engineer available during deployment

---

## Monitoring & Alerting

### Sentry (Error Monitoring)

**Status:** ✅ Integrated (Phase 1)

**Monitored:**
- ✅ Client-side React errors
- ✅ Server action errors
- ✅ API route errors
- ✅ FX rate lookup failures
- ✅ Supabase RLS permission errors

**Alerts:**
- Email: Critical errors (production)
- Slack: Error rate spikes
- Weekly digest: Error trends

**Release Tracking:**
- Automatic via Sentry Vercel integration
- Source maps uploaded for stack traces
- Commit SHA tagged on each release

See [SENTRY_INTEGRATION.md](../SENTRY_INTEGRATION.md) for full documentation.

---

### PostHog (Analytics)

**Status:** 📋 Planned (Phase 3)

**Tracked Events:**
- User auth: `signup`, `login`, `logout`
- Trip management: `trip_created`, `invite_sent`
- Expenses: `expense_created`, `settlement_marked_paid`
- Offline: `went_offline`, `sync_completed`

**Session Recordings:**
- Enabled for Pro users
- 10% sampling for Free users

---

### Vercel Analytics

**Status:** ✅ Enabled

**Metrics:**
- Core Web Vitals (LCP, FID, CLS)
- Real User Monitoring (RUM)
- Geographic performance breakdown

**Dashboard:** `vercel.com/[team]/tripthreads/analytics`

---

## Security Scans

### Dependabot (GitHub)

**Status:** ✅ Enabled

**Configuration:** `.github/dependabot.yml`

**Scans:**
- Daily dependency vulnerability scans
- Automated PR creation for security updates
- Auto-merge for patch updates (npm ecosystem)

---

### CodeQL (Static Analysis)

**Status:** 📋 Planned (Phase 3)

**Scans:**
- JavaScript/TypeScript security vulnerabilities
- SQL injection risks
- XSS vulnerabilities
- Authentication bypasses

---

## Performance Monitoring

### Lighthouse CI

**Status:** 📋 Planned (Phase 3)

**Metrics:**
- Performance score (target: ≥90)
- Accessibility score (target: ≥90)
- SEO score (target: ≥90)
- PWA score (target: ≥80)

**Runs:** On every PR to `main`

---

### Bundle Analysis

**Status:** ✅ Manual via Next.js

**Commands:**
```bash
cd apps/web
npm run build
# Check .next/analyze output
```

**Thresholds:**
- Main bundle: <200KB gzipped
- Total JS: <500KB gzipped
- First Load JS: <300KB

---

## Deployment Checklist

### Pre-Deployment (Staging)

- [ ] All CI checks pass (lint, type-check, tests)
- [ ] Database migrations tested locally
- [ ] Environment variables configured in Vercel
- [ ] Feature flags configured (if applicable)
- [ ] Supabase staging project updated
- [ ] Manual QA completed

### Pre-Deployment (Production)

- [ ] All staging checks pass
- [ ] E2E tests pass in CI
- [ ] Database migration plan reviewed
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Sentry release created
- [ ] Maintenance window scheduled (if needed)
- [ ] Stakeholders notified

### Post-Deployment

- [ ] Health check endpoint returns 200
- [ ] Sentry shows no new critical errors
- [ ] Core user flows tested manually
- [ ] Database migrations verified
- [ ] Performance metrics within range
- [ ] User-facing announcement posted (if needed)

---

## Incident Response

### Severity Levels

| Level | Response Time | Notification |
|-------|---------------|--------------|
| **P0 (Critical)** | Immediate | PagerDuty, Slack, Email |
| **P1 (High)** | < 1 hour | Slack, Email |
| **P2 (Medium)** | < 4 hours | Email |
| **P3 (Low)** | < 24 hours | Email |

### Rollback Procedures

**Web App (Vercel):**
1. Go to Vercel Dashboard → Deployments
2. Find last known good deployment
3. Promote to production
4. Verify health check
5. Monitor Sentry for errors

**Database:**
1. Apply rollback migration from `supabase/migrations/`
2. Verify data integrity
3. Redeploy app with compatible code
4. Restore from backup if needed (last resort)

**Mobile App:**
- ⚠️ Cannot rollback instantly
- Push emergency patch via EAS Update (OTA)
- Submit expedited app store review if needed

---

## Future Improvements

### Phase 3

📋 **Planned:**
- Automated mobile builds on git tags
- PostHog integration for analytics
- Lighthouse CI for performance tracking
- CodeQL security scans

### Phase 4+

📋 **Potential:**
- Blue-green deployments for zero-downtime
- Canary deployments (gradual rollout)
- Feature flags via LaunchDarkly
- Load testing in staging (k6 or Artillery)
- Infrastructure as Code (Terraform)

---

## Useful Commands

### Local Development

```bash
# Start all services
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run format

# Type check
npm run type-check
```

### Supabase

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Generate types
npm run generate-types

# Reset database
supabase db reset
```

### Deployment

```bash
# Deploy to Vercel (automatic on push)
git push origin development  # Staging
git push origin main         # Production

# Manual Vercel deployment
cd apps/web
vercel                       # Preview
vercel --prod                # Production

# Mobile builds
cd apps/mobile
eas build --profile preview --platform ios
```

---

**For more documentation:**
- [DATABASE.md](DATABASE.md) - Database schema and migrations
- [TESTING.md](TESTING.md) - Testing strategy and examples
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Detailed deployment procedures
- [CLAUDE.md](../CLAUDE.md) - Main project documentation
