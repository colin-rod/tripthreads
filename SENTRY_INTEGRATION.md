# Sentry Integration Summary

**Status:** ✅ Completed
**Date:** 2025-11-08
**Phase:** Phase 1 (Core Foundation)

---

## Overview

Sentry error monitoring has been fully integrated into TripThreads web application following best practices for Next.js applications. All critical error paths now report to Sentry with rich context for debugging.

---

## What Was Implemented

### 1. Package Installation

- ✅ Installed `@sentry/nextjs` (v10.23.0)

### 2. Configuration Files

Created Sentry initialization files for all Next.js runtimes:

- ✅ `sentry.client.config.ts` - Client-side (browser) error tracking
- ✅ `sentry.server.config.ts` - Server-side (Node.js) error tracking
- ✅ `sentry.edge.config.ts` - Edge runtime error tracking
- ✅ `instrumentation.ts` - Next.js instrumentation hook
- ✅ `next.config.ts` - Configured Sentry webpack plugin and source maps

**Key Features:**

- Session replay for debugging (10% sample rate in production)
- Source map uploads for better stack traces
- Request context sanitization (removes auth headers)
- Ad-blocker bypass via `/monitoring` tunnel route
- Automatic Vercel Cron monitoring

### 3. Error Boundary Integration

**File:** `apps/web/components/error-boundary.tsx`

- ✅ Added `Sentry.captureException()` to `componentDidCatch`
- ✅ Captures React component stack traces
- ✅ Maintains existing error UI and dev logging

### 4. Server Actions

#### Expenses Action (`apps/web/app/actions/expenses.ts`)

**Error Tracking:**

- ✅ FX rate lookup failures (with currency pair, date, trip context)
- ✅ FX rate unavailable warnings (with Sentry message)
- ✅ Expense creation failures (with Supabase error codes)
- ✅ Expense participant creation failures
- ✅ Unexpected errors with full context

**Context Captured:**

- Trip ID, amount, currency, description
- Supabase error codes, details, hints
- FX rate lookup parameters

#### Chat Action (`apps/web/app/actions/chat.ts`)

**Error Tracking:**

- ✅ User message creation failures
- ✅ Bot message creation failures
- ✅ Message fetching failures
- ✅ File upload failures (with file metadata)
- ✅ Unexpected errors

**Context Captured:**

- Trip ID, message metadata
- File name, size, type
- Supabase error codes, details, hints
- Has attachments flag

### 5. API Routes

#### OpenAI Parser (`apps/web/app/api/parse-with-openai/route.ts`)

**Error Tracking:**

- ✅ API timeout errors (30s limit)
- ✅ Authentication errors (401)
- ✅ Rate limit errors (429)
- ✅ Unexpected errors

**Context Captured:**

- Parser type (date vs expense)
- Model used (gpt-4o-mini)
- Input preview (first 100 chars)
- API key status (present/missing)

#### File Upload (`apps/web/app/api/upload-attachment/route.ts`)

**Error Tracking:**

- ✅ Supabase storage upload failures
- ✅ Unexpected errors

**Context Captured:**

- Trip ID, file name, size, type
- Storage bucket and path
- Supabase error message

### 6. FX Utilities

**File:** `packages/core/src/utils/fx.ts`

**Error Tracking:**

- ✅ On-demand FX fetch failures (API errors)
- ✅ FX rate unavailable warnings

**Context Captured:**

- Currency pair (from → to)
- Date of exchange rate
- Operation type

**Replaced TODOs:**

- Removed 2 `TODO: Log to Sentry` comments with actual implementation

### 7. Environment Variables

**Updated Files:**

- ✅ `.env.example` - Added comprehensive Sentry configuration docs

**New Environment Variables:**

- `NEXT_PUBLIC_SENTRY_DSN` - Public DSN for error reporting
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT` - Environment name (development, staging, production)
- `SENTRY_AUTH_TOKEN` - (Optional) For source map uploads
- `SENTRY_ORG` - (Optional) Organization name
- `SENTRY_PROJECT` - (Optional) Project name

Also added `OPENAI_API_KEY` documentation (was missing).

### 8. Documentation

**Updated Files:**

- ✅ `CLAUDE.md` - Updated Sentry section with integration status
- ✅ Created `SENTRY_INTEGRATION.md` - This file

---

## Error Taxonomy

All Sentry events are tagged with:

### Feature Tags

- `feature: expenses` - Expense tracking errors
- `feature: chat` - Chat message errors
- `feature: fx_rates` - Currency conversion errors
- `feature: openai` - AI parser errors
- `feature: storage` - File upload errors

### Operation Tags

- `operation: create` / `create_message` / `create_expense`
- `operation: fetch_messages`
- `operation: upload_attachment`
- `operation: on_demand_fetch`
- `operation: lookup`

### Error Type Tags

- `errorType: unexpected` - Catch-all errors
- `errorType: timeout` - API timeouts
- `errorType: auth` - Authentication failures
- `errorType: rate_limit` - Rate limit exceeded

---

## Context Enrichment

Every Sentry error includes relevant context:

### Request Context

- Trip ID
- User ID (when available)
- Input data (sanitized)

### Domain-Specific Context

- **Expenses:** Amount, currency, description, participants
- **FX Rates:** Currency pair, date, base currency
- **Files:** Name, size, type, storage path
- **OpenAI:** Model, parser type, input preview

### Database Context (Supabase errors)

- Error code
- Error details
- Error hint

---

## Testing Sentry Integration

### 1. Setup

Create a Sentry account and project:

1. Sign up at https://sentry.io
2. Create a new Next.js project
3. Copy the DSN to `.env.local`

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
```

### 2. Trigger Test Errors

**React Error Boundary:**

```typescript
// Throw error in any component
throw new Error('Test error from React component')
```

**Server Action:**

```typescript
// In any server action
throw new Error('Test server action error')
```

**API Route:**

```typescript
// In any API route
throw new Error('Test API route error')
```

### 3. Verify in Sentry Dashboard

1. Go to Sentry dashboard → Issues
2. Find your test errors
3. Verify context (tags, user, request data)
4. Check stack traces (should show source-mapped code)

---

## Production Deployment

### 1. Vercel Environment Variables

Add to Vercel project settings:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_AUTH_TOKEN=xxx  # For source maps
SENTRY_ORG=your-org
SENTRY_PROJECT=tripthreads-web
```

### 2. Source Maps

Source maps are automatically uploaded during Vercel builds via the Sentry webpack plugin configured in `next.config.ts`.

**Important:** Set `SENTRY_AUTH_TOKEN` for source map uploads.

### 3. Sample Rates

**Production Settings (configured in `sentry.client.config.ts`):**

- Traces: 10% sample rate (adjustable)
- Session Replay: 10% of sessions
- Replays on Error: 100% (all errors get replay)

**Development Settings:**

- Traces: 100% sample rate
- Session Replay: 0% (disabled in dev)

---

## Free Tier Limits

**Sentry Free Tier:**

- 5,000 errors/month
- 50 replays/month
- 14-day data retention

**Estimated Usage (MVP):**

- 500 trips/month × 2% error rate = ~1,000 errors/month
- Well within free tier limits

**When to Upgrade:**

- 10,000+ trips/month (estimated ~2,000 errors/month)
- Need longer data retention
- Need more session replays

---

## Monitoring Best Practices

### 1. Error Alerts

Configure Sentry alerts for:

- **Critical:** Payment failures, data loss
- **High:** FX rate unavailable (affects settlements)
- **Medium:** OpenAI rate limits, upload failures
- **Low:** General errors

### 2. Weekly Review

Check Sentry dashboard weekly for:

- New error types
- Error frequency trends
- Performance regressions
- User-reported issues correlation

### 3. Release Tracking

Tag releases with Git SHA to track errors by deployment:

```bash
# Automatically done by Vercel + Sentry integration
```

---

## Next Steps (Future Enhancements)

### Phase 2: Offline Sync

- [ ] Add Sentry to offline sync queue errors
- [ ] Track sync conflict resolution
- [ ] Monitor IndexedDB/SQLite errors

### Phase 3: Payments

- [ ] Add Sentry to Stripe webhook errors
- [ ] Track payment failures with customer context
- [ ] Monitor subscription lifecycle errors

### Phase 4: PostHog Integration

- [ ] Correlate Sentry errors with PostHog events
- [ ] Link session replays to user journeys
- [ ] Track error → feature usage correlation

### Mobile (Expo)

- [ ] Install `@sentry/react-native`
- [ ] Configure for iOS/Android
- [ ] Add to mobile server actions

---

## Files Modified

### New Files

- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`
- `apps/web/sentry.edge.config.ts`
- `apps/web/instrumentation.ts`
- `SENTRY_INTEGRATION.md` (this file)

### Modified Files

- `apps/web/next.config.ts`
- `apps/web/package.json`
- `apps/web/components/error-boundary.tsx`
- `apps/web/app/actions/expenses.ts`
- `apps/web/app/actions/chat.ts`
- `apps/web/app/api/parse-with-openai/route.ts`
- `apps/web/app/api/upload-attachment/route.ts`
- `packages/core/src/utils/fx.ts`
- `.env.example`
- `CLAUDE.md`

---

## Success Metrics

**Tracking in Sentry:**

- Error rate: Target <2% (per CLAUDE.md)
- API response times: Target <100ms p95
- FX rate availability: Target >95%
- Upload success rate: Target >99%

**Correlation with PostHog (Phase 4):**

- Error → feature abandonment rate
- Error → support ticket correlation
- Error → user retention impact

---

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://sentry.io/)
- [Project Sentry Settings](https://sentry.io/settings/projects/)
- [Error Budgets](https://sentry.io/for/error-budgets/)

---

**Integration Complete!** 🎉

All recommended Sentry monitoring opportunities from the original recommendations have been implemented. The application now has comprehensive error tracking across all critical paths.
