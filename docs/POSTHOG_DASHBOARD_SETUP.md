# PostHog Dashboard Setup Guide

**Last Updated:** December 2024
**Status:** Ready for Implementation
**Related:** [ANALYTICS_EVENTS.md](./ANALYTICS_EVENTS.md)

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Project Configuration](#project-configuration)
3. [Funnel Definitions](#funnel-definitions)
4. [Dashboard Configuration](#dashboard-configuration)
5. [Alert Setup](#alert-setup)
6. [Platform Filtering](#platform-filtering)
7. [Testing & Verification](#testing--verification)

---

## Environment Setup

### Prerequisites

- PostHog account (Cloud or Self-Hosted)
- Project API key
- Admin access to PostHog dashboard

### Environment Variables

**Web (.env.local):**

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Mobile (.env):**

```bash
EXPO_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Important:** Use the **same project key** for both web and mobile to enable unified tracking with platform filtering.

---

## Project Configuration

### Basic Project Settings

1. Navigate to **Project Settings** in PostHog
2. Configure the following:
   - **Project Name:** TripThreads
   - **Time Zone:** UTC (or your preferred timezone)
   - **Session Recording:** Enable for Pro users + 10% Free tier (optional)
   - **Feature Flags:** Enable if using A/B testing (Phase 5+)

### User Identification

Users are automatically identified by:

- **User ID:** Supabase user UUID
- **Properties:**
  - `email` - User email address
  - `name` - Full name or email
  - `platform` - `'web'`, `'ios'`, or `'android'`
  - `plan` - `'free'` or `'pro'` (when implemented)

---

## Funnel Definitions

TripThreads tracks **6 core funnels** to measure user journey and product adoption.

### Funnel 1: User Acquisition

**Goal:** Track signup → onboarding completion (Target: 70%+)

**Steps:**

1. `signup` (any method)
2. `onboarding_started`
3. `onboarding_completed`

**Configuration:**

- **Conversion Window:** 1 hour
- **Breakdown By:** `method` (email, google, apple)
- **Success Threshold:** >70% completion rate

**Setup in PostHog:**

1. Go to **Insights** → **New Insight** → **Funnel**
2. Add steps:
   - Step 1: Event = `signup`
   - Step 2: Event = `onboarding_started`
   - Step 3: Event = `onboarding_completed`
3. Set **Conversion window:** 1 hour
4. Add **Breakdown:** property `method`
5. Save to **"TripThreads - Core Metrics"** dashboard

**Expected Results:**

- Signup → Onboarding: >90%
- Onboarding → Complete: >70%
- Drop-off primarily at onboarding step 3-4

---

### Funnel 2: Trip Creation

**Goal:** Track signup → first trip with collaborators (Target: 60%+)

**Steps:**

1. `signup`
2. `trip_created`
3. `invite_sent`
4. `invite_accepted`

**Configuration:**

- **Conversion Window:** 7 days
- **Breakdown By:** `source` (manual, template, import)
- **Success Threshold:** >60% first trip creation

**Setup in PostHog:**

1. Go to **Insights** → **New Insight** → **Funnel**
2. Add steps:
   - Step 1: Event = `signup`
   - Step 2: Event = `trip_created`
   - Step 3: Event = `invite_sent`
   - Step 4: Event = `invite_accepted`
3. Set **Conversion window:** 7 days
4. Add **Breakdown:** property `source`
5. Save to dashboard

**Expected Results:**

- Signup → Trip Created: >60%
- Trip Created → Invite Sent: >40%
- Invite Sent → Invite Accepted: >50%

---

### Funnel 3: Expense Tracking Adoption

**Goal:** Track expense feature usage and settlement completion (Target: 50% adoption)

**Steps:**

1. `trip_created`
2. `expense_added_nl` OR `expense_added_manual`
3. `settlement_created`
4. `settlement_marked_paid`

**Configuration:**

- **Conversion Window:** 30 days (trip lifecycle)
- **Breakdown By:** `split_type` (equal, percentage, amount)
- **Success Threshold:** >50% trips use expenses, 80% repeat usage

**Setup in PostHog:**

1. Go to **Insights** → **New Insight** → **Funnel**
2. Add steps:
   - Step 1: Event = `trip_created`
   - Step 2: Event = `expense_added_nl` OR `expense_added_manual` (use OR filter)
   - Step 3: Event = `settlement_created`
   - Step 4: Event = `settlement_marked_paid`
3. Set **Conversion window:** 30 days
4. Add **Breakdown:** property `split_type`
5. Add **Filter:** trip_id (to track per-trip adoption)
6. Save to dashboard

**Expected Results:**

- Trip → First Expense: >50%
- First Expense → Repeat Expense: >80%
- Settlement Created → Marked Paid: >60%

---

### Funnel 4: Itinerary Building

**Goal:** Track itinerary feature adoption (Target: 40% adoption, 3+ items/trip)

**Steps:**

1. `trip_created`
2. `item_added_nl` OR `item_added_manual` (1st item)
3. `item_added_nl` OR `item_added_manual` (2nd item)
4. `item_added_nl` OR `item_added_manual` (3rd item)

**Configuration:**

- **Conversion Window:** 30 days
- **Breakdown By:** `item_type` (transport, accommodation, dining, activity)
- **Success Threshold:** >40% trips have itinerary, >3 items average

**Setup in PostHog:**

1. Go to **Insights** → **New Insight** → **Funnel**
2. Add steps (using sequential occurrence):
   - Step 1: Event = `trip_created`
   - Step 2: Event = `item_added_nl` OR `item_added_manual` (occurrence: 1st)
   - Step 3: Event = `item_added_nl` OR `item_added_manual` (occurrence: 2nd)
   - Step 4: Event = `item_added_nl` OR `item_added_manual` (occurrence: 3rd)
3. Set **Conversion window:** 30 days
4. Add **Breakdown:** property `item_type`
5. Save to dashboard

**Expected Results:**

- Trip → 1st Item: >40%
- 1st → 2nd Item: >70%
- 2nd → 3rd Item: >60%

---

### Funnel 5: Free-to-Pro Conversion

**Goal:** Track monetization funnel (Target: 5%+ conversion)

**Steps:**

1. `upgrade_viewed`
2. `checkout_started`
3. `subscription_completed`

**Configuration:**

- **Conversion Window:** 7 days
- **Breakdown By:** `plan` (monthly, annual, one-off)
- **Success Threshold:** >5% conversion rate

**Setup in PostHog:**

1. Go to **Insights** → **New Insight** → **Funnel**
2. Add steps:
   - Step 1: Event = `upgrade_viewed`
   - Step 2: Event = `checkout_started`
   - Step 3: Event = `subscription_completed`
3. Set **Conversion window:** 7 days
4. Add **Breakdown:** property `plan`
5. Add **Filter:** exclude users already on Pro
6. Save to dashboard

**Expected Results:**

- View → Checkout: >20%
- Checkout → Complete: >50%
- Overall Conversion: >5%

**Note:** This funnel will be active once Stripe integration is complete (Phase 3.2+).

---

### Funnel 6: Retention

**Goal:** Track login retention at 1/7/30 days (Target: 40%/30%/20%)

**Steps:**

1. `signup`
2. `login` (at Day 1)
3. `login` (at Day 7)
4. `login` (at Day 30)

**Configuration:**

- **Type:** Retention funnel
- **Breakdown By:** `platform` (web, mobile)
- **Success Threshold:** 40% D1, 30% D7, 20% D30

**Setup in PostHog:**

1. Go to **Insights** → **New Insight** → **Retention**
2. Configure:
   - **Cohort Event:** `signup`
   - **Return Event:** `login`
   - **Time intervals:** 1 day, 7 days, 30 days
3. Add **Breakdown:** property `platform`
4. Save to dashboard

**Expected Results:**

- Day 1 Retention: >40%
- Day 7 Retention: >30%
- Day 30 Retention: >20%

---

## Dashboard Configuration

### Main Dashboard: "TripThreads - Core Metrics"

**Dashboard Layout:**

#### Row 1: Key Metrics

- **Widget 1:** DAU/WAU/MAU (Line Chart)
  - Events: `signup`, `login`, all feature events
  - Breakdown: by date
  - Display: Line chart, 30-day rolling average

- **Widget 2:** Platform Split (Pie Chart)
  - Events: All events
  - Filter: `platform` property
  - Display: Pie chart (web vs mobile)

#### Row 2: Acquisition Funnels

- **Widget 3:** User Acquisition Funnel (Funnel #1)
  - Mini view, link to full funnel

- **Widget 4:** Trip Creation Funnel (Funnel #2)
  - Mini view, link to full funnel

#### Row 3: Feature Adoption Funnels

- **Widget 5:** Expense Tracking Funnel (Funnel #3)
  - Mini view, link to full funnel

- **Widget 6:** Itinerary Building Funnel (Funnel #4)
  - Mini view, link to full funnel

#### Row 4: Monetization & Retention

- **Widget 7:** Free-to-Pro Funnel (Funnel #5)
  - Mini view, link to full funnel

- **Widget 8:** Retention Cohort (Funnel #6)
  - Table view, 30-day cohorts

#### Row 5: Top Events

- **Widget 9:** Top Events Table
  - Events: All events
  - Display: Table sorted by volume
  - Time range: Last 7 days

**Setup Steps:**

1. Go to **Dashboards** → **New Dashboard**
2. Name: "TripThreads - Core Metrics"
3. Add description: "Primary metrics dashboard for TripThreads product analytics"
4. Add widgets using the layout above
5. Set **Default Time Range:** Last 30 days
6. Enable **Auto-refresh:** Every 5 minutes (optional)
7. Share with team (read-only or edit access)

---

## Alert Setup

Configure alerts to monitor critical metrics and detect issues.

### Alert 1: Onboarding Completion Drop

**Condition:**

- Funnel #1 (User Acquisition) completion rate < 60%
- Check frequency: Daily
- Threshold: 2 consecutive days below target

**Setup:**

1. Go to Funnel #1
2. Click **Set Alert**
3. Configure:
   - Metric: Conversion rate (Step 1 → Step 3)
   - Condition: Falls below 60%
   - Duration: 2 days
   - Recipients: Product team
4. Save alert

---

### Alert 2: Trip Creation Rate Drop

**Condition:**

- Funnel #2 (Trip Creation) completion rate < 50%
- Check frequency: Daily
- Threshold: 2 consecutive days below target

**Setup:**

1. Go to Funnel #2
2. Click **Set Alert**
3. Configure:
   - Metric: Conversion rate (Signup → Trip Created)
   - Condition: Falls below 50%
   - Duration: 2 days
   - Recipients: Product team
4. Save alert

---

### Alert 3: Error Event Spike

**Condition:**

- Error events (if tracked) > 5% of total events
- Check frequency: Hourly
- Threshold: Immediate alert

**Setup:**

1. Go to **Insights** → **New Insight** → **Trend**
2. Add events:
   - All events (total count)
   - Error events (if tracked)
3. Create formula: (Error events / All events) \* 100
4. Click **Set Alert**
5. Configure:
   - Condition: Percentage > 5%
   - Check frequency: Hourly
   - Recipients: Engineering team
6. Save alert

---

### Alert 4: Zero Events (Downtime Detection)

**Condition:**

- No events received for 1 hour
- Check frequency: Every 15 minutes
- Threshold: Immediate alert

**Setup:**

1. Go to **Insights** → **New Insight** → **Trend**
2. Add all events
3. Set time range: Last 1 hour
4. Click **Set Alert**
5. Configure:
   - Condition: Count = 0
   - Check frequency: 15 minutes
   - Recipients: Engineering team (PagerDuty integration recommended)
6. Save alert

---

## Platform Filtering

All events are automatically tagged with a `platform` property to enable filtering.

### Platform Values

- `'web'` - Next.js web application
- `'mobile'` - React Native mobile app (iOS + Android)

### Common Filters

**View web-only events:**

```
Filter: platform = 'web'
```

**View mobile-only events:**

```
Filter: platform = 'mobile'
```

**Compare web vs mobile:**

```
Breakdown by: platform
```

### Example Use Cases

1. **Mobile Adoption Rate**
   - Total events with `platform = 'mobile'` / All events
   - Target: >30% mobile usage within 6 months

2. **Platform-Specific Funnels**
   - Run Funnel #1 (User Acquisition) separately for web and mobile
   - Compare conversion rates to identify platform issues

3. **Feature Parity**
   - Compare `expense_added_nl` events by platform
   - Ensure mobile feature adoption matches web

---

## Testing & Verification

### Pre-Launch Checklist

Before going live, verify the following:

**Environment:**

- [ ] PostHog API keys set in `.env.local` (web) and `.env` (mobile)
- [ ] PostHog provider initialized in app layout (both platforms)
- [ ] User identification working (check PostHog Persons tab)
- [ ] Platform property set correctly (web vs mobile)

**Events:**

- [ ] All 39 event helpers created and exported
- [ ] Events tracked only on success (not on errors)
- [ ] Event properties match schema (see ANALYTICS_EVENTS.md)
- [ ] Test each P0 event manually in development

**Funnels:**

- [ ] All 6 funnels created in PostHog
- [ ] Conversion windows set correctly
- [ ] Breakdowns configured
- [ ] Funnels saved to dashboard

**Dashboard:**

- [ ] All 9 widgets added
- [ ] Default time range set (30 days)
- [ ] Dashboard shared with team
- [ ] Mobile-friendly layout

**Alerts:**

- [ ] All 4 alerts configured
- [ ] Recipients set correctly
- [ ] Test alerts manually (trigger condition)
- [ ] PagerDuty/Slack integration (optional)

### Manual Testing Steps

**1. Test Signup & Onboarding (Funnel #1):**

```bash
# Web
1. Sign up with email
2. Complete onboarding
3. Check PostHog: signup → onboarding_started → onboarding_completed

# Mobile
1. Repeat on iOS/Android
2. Verify platform = 'mobile'
```

**2. Test Trip Creation (Funnel #2):**

```bash
1. Create a trip
2. Send an invite
3. Accept invite (different user)
4. Check PostHog: trip_created → invite_sent → invite_accepted
```

**3. Test Expense Tracking (Funnel #3):**

```bash
1. Add expense via NL parser
2. Calculate settlements
3. Mark settlement as paid
4. Check PostHog: expense_added_nl → settlement_created → settlement_marked_paid
```

**4. Test Platform Filtering:**

```bash
1. Generate events on web and mobile
2. In PostHog, filter by platform = 'web' and platform = 'mobile'
3. Verify correct counts
```

### Production Monitoring

**First Week:**

- Check dashboard daily
- Verify all events are flowing correctly
- Monitor funnel conversion rates
- Adjust alerts if too noisy or too quiet

**Ongoing:**

- Weekly dashboard review
- Monthly funnel analysis
- Quarterly dashboard iteration

---

## Additional Resources

### PostHog Documentation

- [Funnels](https://posthog.com/docs/user-guides/funnels)
- [Dashboards](https://posthog.com/docs/user-guides/dashboards)
- [Alerts](https://posthog.com/docs/user-guides/alerts)
- [Session Recording](https://posthog.com/docs/user-guides/recordings)

### TripThreads Analytics Docs

- [ANALYTICS_EVENTS.md](./ANALYTICS_EVENTS.md) - Complete event schema
- [CLAUDE.md](../CLAUDE.md) - Project overview

### Support

- PostHog Community: https://posthog.com/questions
- PostHog Slack: https://posthog.com/slack
- TripThreads Team: See Linear project

---

**Last Updated:** December 2024
**Version:** 1.0
**Status:** Ready for Implementation
