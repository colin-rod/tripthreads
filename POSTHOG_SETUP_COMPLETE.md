# PostHog Provider Setup - Complete ✅

**Date:** November 28, 2025
**Status:** Provider created, ready for API key

---

## What Was Done

### ✅ 1. PostHog SDK Installed

Already installed in `apps/web/package.json`:

```json
"posthog-js": "^1.298.1"
```

### ✅ 2. PostHog Provider Created

Created: [apps/web/lib/analytics/posthog-provider.tsx](apps/web/lib/analytics/posthog-provider.tsx)

Features:

- Initializes PostHog on client-side only
- Identifies users when they log in
- Resets analytics when users log out
- Debug mode enabled in development
- Gracefully handles missing API key

### ✅ 3. Added to Root Layout

Updated: [apps/web/app/layout.tsx](apps/web/app/layout.tsx)

Provider wraps the entire app inside `AuthProvider`:

```tsx
<AuthProvider>
  <PostHogProvider>{children}</PostHogProvider>
</AuthProvider>
```

### ✅ 4. Environment Variables Added

Updated: `.env.local`

Added placeholders:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_PROJECT_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## Next Steps

### 1. Get Your PostHog API Key (5 minutes)

1. **Sign up for PostHog** (if you haven't already):
   - Go to https://app.posthog.com/signup
   - Create a free account (no credit card required)

2. **Create a new project** (or use existing):
   - Project name: "TripThreads Web"
   - Industry: Travel & Hospitality

3. **Get your project API key**:
   - Go to Project Settings → Project API Key
   - Copy the key (starts with `phc_`)

4. **Update `.env.local`**:

   ```env
   NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_ACTUAL_KEY_HERE
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

5. **Restart your dev server**:
   ```bash
   npm run dev
   ```

### 2. Verify Setup (2 minutes)

1. **Open your browser console** (F12)
2. **Look for PostHog debug logs** (should see initialization messages)
3. **Check PostHog dashboard**:
   - Go to https://app.posthog.com
   - Click "Activity" → should see events coming in

### 3. Test User Identification

1. **Sign up or log in** to your app
2. **Check PostHog dashboard** → "Persons"
3. **You should see yourself** identified with:
   - User ID
   - Email
   - Name
   - Plan: "free"

---

## How It Works

### Client-Side Only

PostHog is initialized **only in the browser** (never on server):

```typescript
if (typeof window !== 'undefined') {
  posthog.init(...)
}
```

### User Identification

When a user logs in, PostHog automatically identifies them:

```typescript
posthog.identify(user.id, {
  email: user.email,
  name: user.user_metadata?.full_name,
  plan: 'free',
})
```

### Event Tracking

All events use the existing wrapper at [apps/web/lib/analytics/posthog.ts](apps/web/lib/analytics/posthog.ts):

```typescript
import { posthog } from '@/lib/analytics/posthog'

posthog.capture('event_name', {
  property: 'value',
})
```

### No-Op When Missing

If `NEXT_PUBLIC_POSTHOG_KEY` is not set, the wrapper returns a no-op client:

- No errors thrown
- Events are silently ignored
- App continues working normally

---

## Testing

### Development Mode

PostHog debug mode is enabled in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  posthog.debug()
}
```

You'll see console logs like:

```
[PostHog] Initialized
[PostHog] Identifying user: abc-123-def
[PostHog] Event captured: signup
```

### Production Mode

Debug mode is disabled in production (clean logs).

---

## Current Status

| Task                        | Status                       |
| --------------------------- | ---------------------------- |
| PostHog SDK installed       | ✅ Complete                  |
| Provider component created  | ✅ Complete                  |
| Added to root layout        | ✅ Complete                  |
| Environment variables added | ✅ Complete                  |
| API key obtained            | ⏳ **Waiting**               |
| Events implemented          | ❌ Not started (5 P0 events) |

---

## What's Next

Once you've added your PostHog API key, you're ready to implement the P0 analytics events!

See: [docs/ANALYTICS_P0_IMPLEMENTATION_PLAN.md](docs/ANALYTICS_P0_IMPLEMENTATION_PLAN.md)

**P0 Events to Implement:**

1. `signup` - User creates account
2. `login` - User signs in
3. `trip_created` - User creates a trip
4. `expense_added_nl` - Expense via natural language
5. `expense_added_manual` - Expense via manual form

**Estimated Time:** ~10-12 hours (with tests)

---

## Resources

- **PostHog Docs:** https://posthog.com/docs
- **React Integration:** https://posthog.com/docs/libraries/react
- **Event Properties:** https://posthog.com/docs/data/properties
- **Analytics Schema:** [docs/ANALYTICS_EVENTS.md](docs/ANALYTICS_EVENTS.md)

---

**Setup Complete!** 🎉

Just add your PostHog API key and you're ready to start tracking events.
