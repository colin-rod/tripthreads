# CRO-829: Analytics Event Schema Definition - Summary

**Issue:** Analytics event schema definition
**Parent:** CRO-742 [EPIC] E11: Production Readiness (Analytics, Monitoring & Push)
**Status:** ✅ Complete
**Date:** November 28, 2025

---

## Overview

This task defined a comprehensive analytics event schema for TripThreads, including:

- Event naming conventions
- Required properties per event
- Measurement funnels (6 key funnels)
- Event priorities (P0-P3)
- Success metrics per funnel

All documentation has been added to [docs/ANALYTICS_EVENTS.md](docs/ANALYTICS_EVENTS.md).

---

## Deliverables

### 1. Event Naming Conventions ✅

**Format:** `<category>_<action>_<optional_detail>`

**Rules:**

- Use snake_case for event names
- Use past tense for completed actions
- Keep names under 50 characters
- Avoid abbreviations (except "nl" for natural language)

**Example:** `expense_added_nl` (expense added via natural language)

---

### 2. User Actions to Track ✅

**Total Events Defined:** 39 events across 10 categories

| Category        | Events | Implemented | Missing   |
| --------------- | ------ | ----------- | --------- |
| Authentication  | 3      | 0           | 3         |
| Onboarding      | 5      | 5           | 0         |
| Tours           | 5      | 4           | 1 (buggy) |
| Trip Management | 3      | 0           | 3         |
| Itinerary       | 4      | 0           | 4         |
| Expenses        | 4      | 0           | 4         |
| Settlements     | 2      | 0           | 2         |
| Media           | 3      | 0           | 3         |
| Offline Sync    | 3      | 0           | 3         |
| Monetization    | 3      | 0           | 3         |
| **New Events**  | 3      | 0           | 3         |
| **TOTAL**       | **39** | **9**       | **30**    |

**Implementation Status:** 23% complete (9/39 events)

---

### 3. Required Properties Per Event ✅

All 39 events have fully defined property schemas. Example:

**`expense_added_nl`**

```typescript
{
  trip_id: string
  amount_cents: number
  currency: string
  split_type: 'equal' | 'percentage' | 'amount'
  participant_count: number
  parse_success: boolean
  has_receipt: boolean
}
```

See [docs/ANALYTICS_EVENTS.md](docs/ANALYTICS_EVENTS.md) for complete schemas.

---

### 4. Funnels to Measure ✅

Defined **6 key measurement funnels** with success metrics:

#### Funnel 1: User Acquisition

**Goal:** Convert visitors to registered users

**Steps:**

```
signup → onboarding_started → onboarding_step_viewed → onboarding_completed
```

**Success Metrics:**

- Signup conversion: 5%+ (visitors → signups)
- Onboarding completion: 70%+ (signups → completed)
- Time to complete: <3 minutes

---

#### Funnel 2: Trip Creation

**Goal:** Convert new users to trip creators

**Steps:**

```
signup → trip_created → invite_sent → invite_accepted
```

**Success Metrics:**

- First trip creation: 60%+ (new users → trip within 7 days)
- Multi-participant trips: 40%+ (trips with ≥2 participants)
- Invite acceptance: 70%+ (invites → accepted)
- Time to first trip: <5 minutes

---

#### Funnel 3: Expense Tracking

**Goal:** Drive engagement with core expense feature

**Steps:**

```
trip_created → expense_added_nl → expense_added_nl → settlement_created → settlement_marked_paid
```

**Success Metrics:**

- Expense adoption: 50%+ (trips → trips with ≥1 expense)
- Repeat usage: 80%+ (users with ≥2 expenses)
- NL usage: 60%+ (NL vs. manual)
- Settlement completion: 30%+ (settlements → paid)

---

#### Funnel 4: Itinerary Building

**Goal:** Measure itinerary feature adoption

**Steps:**

```
trip_created → item_added_nl → item_added_nl
```

**Success Metrics:**

- Itinerary adoption: 40%+ (trips → trips with ≥1 item)
- Items per trip: 3+ average
- NL usage: 50%+ (NL vs. manual)
- Edit rate: 20%+ (items created → edited)

---

#### Funnel 5: Free-to-Pro Conversion

**Goal:** Convert free users to paid Pro subscribers

**Steps:**

```
upgrade_viewed → checkout_started → subscription_completed
```

**Success Metrics:**

- Conversion rate: 5%+ (free → paid within 30 days)
- Upgrade → Checkout: 30%+
- Checkout → Completion: 80%+
- Annual vs. Monthly: 40%+ annual

---

#### Funnel 6: Engagement & Retention

**Goal:** Measure ongoing product engagement

**Steps:**

```
signup → login (1/7/30 days later)
```

**Success Metrics:**

- Day 1 retention: 40%+
- Day 7 retention: 30%+
- Day 30 retention: 20%+
- DAU/MAU (stickiness): 20%+

---

## Event Priority Matrix

### P0 - Critical (MVP Blockers) - 7 events

**Required before production launch:**

| Event                  | Status     | Implementation File                                               |
| ---------------------- | ---------- | ----------------------------------------------------------------- |
| `signup`               | ❌ Missing | `apps/web/app/(auth)/signup/page.tsx:31`                          |
| `login`                | ❌ Missing | `apps/web/app/(auth)/login/page.tsx`                              |
| `onboarding_started`   | ✅ Done    | `apps/web/components/features/onboarding/Onboarding.tsx:60`       |
| `onboarding_completed` | ✅ Done    | `apps/web/components/features/onboarding/Onboarding.tsx:75`       |
| `trip_created`         | ❌ Missing | `apps/web/components/features/trips/CreateTripDialog.tsx:71`      |
| `expense_added_nl`     | ❌ Missing | `apps/web/components/features/expenses/ExpenseInput.tsx`          |
| `expense_added_manual` | ❌ Missing | `apps/web/components/features/expenses/ExpenseFormDialog.tsx:308` |

**Status:** 2/7 implemented (29%) - **5 events blocking MVP launch**

---

### P1 - High Priority (Within 1 Month) - 11 events

**Important for analytics but not launch blockers:**

| Event                    | Status                        |
| ------------------------ | ----------------------------- |
| `logout`                 | ❌ Missing                    |
| `onboarding_skipped`     | ✅ Done                       |
| `tour_started`           | ✅ Done                       |
| `tour_completed`         | ✅ Done                       |
| `tour_dismissed`         | ⚠️ **BUG** (uses console.log) |
| `invite_sent`            | ❌ Missing                    |
| `invite_accepted`        | ❌ Missing                    |
| `item_added_nl`          | ❌ Missing                    |
| `item_added_manual`      | ❌ Missing                    |
| `settlement_created`     | ❌ Missing                    |
| `settlement_marked_paid` | ❌ Missing                    |

**Status:** 3/11 implemented (27%), 1 buggy, 7 missing

---

### P2 - Medium Priority (Post-Launch) - 9 events

**Nice-to-have, can be added after launch:**

**Status:** 4/9 implemented (44%), 5 missing

---

### P3 - Low Priority (Phase 3+ Features) - 9 events

**Future features not yet built:**

**Status:** 0/9 implemented (0% - expected, features not built yet)

---

## New Events Identified

During schema review, **3 new events** were identified and added:

### 1. `participant_limit_reached` (P1 - High Priority)

**When:** User tries to add 11th participant (Free tier limit: 10)

**Properties:**

```typescript
{
  trip_id: string
  current_count: number // Should be 10
  attempted_action: 'invite' | 'accept_request'
}
```

**Why:** Critical for Free-to-Pro conversion funnel

---

### 2. `photo_limit_reached` (P1 - High Priority)

**When:** User tries to upload 51st photo (Free tier limit: 50)

**Properties:**

```typescript
{
  trip_id: string
  current_count: number // Should be 50
}
```

**Why:** Critical for Free-to-Pro conversion funnel

---

### 3. `chat_message_sent` (P2 - Medium Priority)

**When:** User sends a message in trip chat

**Properties:**

```typescript
{
  trip_id: string
  is_ai_response: boolean
  has_mentions: boolean
}
```

**Why:** Measures chat engagement

---

## Critical Findings

### 🚨 MVP Blockers

**5 P0 events are missing**, preventing production launch:

1. `signup` - Cannot track user acquisition
2. `login` - Cannot track retention
3. `trip_created` - Cannot track trip creation funnel
4. `expense_added_nl` - Cannot track expense feature adoption
5. `expense_added_manual` - Cannot track manual expense creation

**Action Required:** Implement these 5 events before production launch.

---

### ⚠️ Known Bugs

**1 event has a bug:**

- `tour_dismissed` uses `console.log` instead of `posthog.capture`
- **File:** `apps/web/components/features/tour/Tour.tsx:128-131`
- **Fix:** Replace console.log with posthog.capture (5-minute fix)

---

### 📋 PostHog Not Installed

**Critical:** PostHog SDK (`posthog-js`) is not installed.

**Current State:**

- ✅ PostHog wrapper exists: `apps/web/lib/analytics/posthog.ts`
- ✅ All capture calls use the wrapper (future-proof)
- ❌ PostHog SDK not installed (all events are no-ops)

**Required Setup:**

1. Install: `npm install posthog-js --workspace=web`
2. Create PostHog provider component
3. Add provider to root layout
4. Set environment variables

---

## Success Metrics Summary

### Overall Product Success

| Metric                   | Target | Measurement Window    |
| ------------------------ | ------ | --------------------- |
| Free-to-paid conversion  | 5%+    | 30 days               |
| Day 7 retention          | 30%+   | 7 days from signup    |
| Day 30 retention         | 20%+   | 30 days from signup   |
| First trip creation      | 60%+   | 7 days from signup    |
| Multi-participant trips  | 40%+   | All trips             |
| Expense feature adoption | 50%+   | Trips with ≥1 expense |

### Feature-Specific Success

| Feature          | Metric               | Target |
| ---------------- | -------------------- | ------ |
| Onboarding       | Completion rate      | 70%+   |
| Natural Language | NL usage (expenses)  | 60%+   |
| Natural Language | NL usage (itinerary) | 50%+   |
| Settlements      | Completion rate      | 30%+   |
| Invites          | Acceptance rate      | 70%+   |

---

## Next Steps

### Immediate (Before MVP Launch)

1. **Install PostHog SDK** (~30 min)

   ```bash
   cd apps/web
   npm install posthog-js
   ```

2. **Implement P0 Events** (~4-6 hours)
   - [ ] `signup` (auth page)
   - [ ] `login` (auth page)
   - [ ] `trip_created` (CreateTripDialog)
   - [ ] `expense_added_nl` (ExpenseInput)
   - [ ] `expense_added_manual` (ExpenseFormDialog)

3. **Fix tour_dismissed Bug** (~15 min)
   - Replace console.log with posthog.capture in Tour.tsx:128-131

4. **Write Tests** (~4-6 hours)
   - Unit tests for all P0 events
   - Follow pattern from existing onboarding/tour tests

### Short-Term (Within 1 Month)

5. **Implement P1 Events** (~8-10 hours)
   - All trip management, itinerary, and settlement events

6. **Add Limit Hit Events** (~2-3 hours)
   - `participant_limit_reached`
   - `photo_limit_reached`

7. **Set Up PostHog Dashboards**
   - Create funnels in PostHog UI
   - Set up retention cohorts
   - Configure alerts for key metrics

### Long-Term (Post-Launch)

8. **Implement P2 Events** (as needed)
9. **Monitor and Iterate** (ongoing)
   - Review funnel performance weekly
   - Identify drop-off points
   - A/B test improvements

---

## Documentation

**Primary Documentation:** [docs/ANALYTICS_EVENTS.md](docs/ANALYTICS_EVENTS.md)

**Includes:**

- ✅ Event naming conventions
- ✅ All 39 event schemas with properties
- ✅ 6 measurement funnels with success metrics
- ✅ Priority matrix (P0-P3)
- ✅ Implementation status per event
- ✅ Testing guidelines
- ✅ PostHog setup instructions
- ✅ Known issues and fixes

---

## Implementation Effort Estimate

| Task                   | Events | Estimated Time   |
| ---------------------- | ------ | ---------------- |
| Install PostHog        | -      | 30 min           |
| P0 Events              | 5      | 4-6 hours        |
| P0 Tests               | 5      | 4-6 hours        |
| Fix tour_dismissed bug | 1      | 15 min           |
| P1 Events              | 11     | 8-10 hours       |
| P1 Tests               | 11     | 8-10 hours       |
| New limit events       | 3      | 2-3 hours        |
| PostHog dashboards     | -      | 2-3 hours        |
| **TOTAL**              | **20** | **~30-40 hours** |

**MVP Critical Path:** ~9-13 hours (PostHog install + P0 events + tests + bug fix)

---

## References

- **Linear Issue:** CRO-829
- **Parent Epic:** CRO-742 [EPIC] E11: Production Readiness
- **Documentation:** [docs/ANALYTICS_EVENTS.md](docs/ANALYTICS_EVENTS.md)
- **PostHog Wrapper:** [apps/web/lib/analytics/posthog.ts](apps/web/lib/analytics/posthog.ts)
- **Existing Tests:**
  - [apps/web/tests/unit/onboarding/onboarding-analytics.test.tsx](apps/web/tests/unit/onboarding/onboarding-analytics.test.tsx)
  - [apps/web/tests/unit/tour/tour-analytics.test.tsx](apps/web/tests/unit/tour/tour-analytics.test.tsx)

---

**Status:** ✅ Schema Definition Complete
**Next Task:** Implement P0 analytics events (CRO-XXX - to be created)
**Date Completed:** November 28, 2025
