# Phase 4 Implementation Plan: Notification Integration

**Status:** 📋 Ready to Start
**Estimated Time:** 3-4 days
**Prerequisites:** ✅ Phases 1-3 Complete
**Goal:** Integrate per-trip notification preferences into actual notification sending

---

## Overview

Phase 4 connects the user-facing preference UI (completed in Phase 3) to the actual notification delivery system. This involves updating/creating edge functions to check preferences before sending notifications, setting up database triggers, and comprehensive testing.

---

## Tasks Breakdown

### Task 1: Update Existing Edge Function (1-2 hours)

**File:** `supabase/functions/send-access-request-email/index.ts`

**Changes Needed:**

1. Add query to fetch trip participant preferences
2. Add query to fetch user's global preferences
3. Implement preference check using inheritance logic
4. Skip notification if preferences disable it
5. Add logging for preference decisions

**Implementation Pattern:**

```typescript
// After fetching organizer data (line 87)

// Fetch organizer's trip notification preferences
const { data: participantPrefs } = await supabase
  .from('trip_participants')
  .select('notification_preferences')
  .eq('trip_id', trip.id)
  .eq('user_id', organizer.id)
  .single()

// Fetch organizer's global notification preferences
const { data: profile } = await supabase
  .from('profiles')
  .select('notification_preferences')
  .eq('id', organizer.id)
  .single()

// Check if notification should be sent
const tripPrefs = participantPrefs?.notification_preferences
const globalPrefs = profile?.notification_preferences || {}

// Check 'invites' preference (access requests are similar to invites)
const shouldNotify = checkNotificationPreference('invites', tripPrefs, globalPrefs, 'email')

if (!shouldNotify) {
  console.log('Notification skipped due to user preferences')
  return new Response(
    JSON.stringify({
      message: 'Notification skipped - user preference',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

// Continue with email sending...
```

**Helper Function to Add:**

```typescript
function checkNotificationPreference(
  eventType: 'invites' | 'itinerary' | 'expenses' | 'photos' | 'chat' | 'settlements',
  tripPrefs: any,
  globalPrefs: any,
  channel: 'email' | 'push'
): boolean {
  // Check trip preference first
  if (tripPrefs && tripPrefs[eventType] !== null && tripPrefs[eventType] !== undefined) {
    return tripPrefs[eventType]
  }

  // Map event types to global preference keys
  const eventToGlobalEmail: Record<string, string> = {
    invites: 'email_trip_invites',
    itinerary: 'email_trip_updates',
    expenses: 'email_expense_updates',
    photos: 'email_trip_updates',
    chat: 'email_trip_updates',
    settlements: 'email_expense_updates',
  }

  const eventToGlobalPush: Record<string, string> = {
    invites: 'push_trip_invites',
    itinerary: 'push_trip_updates',
    expenses: 'push_expense_updates',
    photos: 'push_trip_updates',
    chat: 'push_trip_updates',
    settlements: 'push_expense_updates',
  }

  const mapping = channel === 'email' ? eventToGlobalEmail : eventToGlobalPush
  const globalKey = mapping[eventType]

  return globalPrefs[globalKey] ?? false
}
```

**Testing:**

- [ ] Test with preferences enabled (should send)
- [ ] Test with trip preference disabled (should skip)
- [ ] Test with global preference disabled (should skip)
- [ ] Test with NULL trip preference inheriting from global
- [ ] Verify logging of skipped notifications

---

### Task 2: Create Expense Notification Edge Function (2-3 hours)

**File:** `supabase/functions/send-expense-notification/index.ts`

**Trigger:** When expense is created or updated
**Recipients:** All trip participants (except the creator)
**Event Type:** `expenses`

**Payload Structure:**

```typescript
interface ExpensePayload {
  type: 'INSERT' | 'UPDATE'
  table: 'expenses'
  record: {
    id: string
    trip_id: string
    created_by: string
    description: string
    amount: number
    currency: string
    date: string
  }
  old_record?: {
    // For UPDATE events
  }
}
```

**Implementation Steps:**

1. Parse webhook payload
2. Fetch expense details with creator and trip info
3. Fetch all trip participants (except creator)
4. For each participant:
   - Fetch their trip notification preferences
   - Fetch their global notification preferences
   - Check if `expenses` notifications are enabled
   - If enabled, add to recipient list
5. Send batch email to all recipients (or individual emails)
6. Log results

**Email Template:**

```html
Subject: New Expense Added to {trip.name} Hi {participant.name}, {creator.name} added a new expense
to {trip.name}: 💰 {expense.description} Amount: {expense.amount} {expense.currency} Date:
{expense.date} View expense details: {tripUrl} --- Manage notification preferences: {preferencesUrl}
```

**Testing:**

- [ ] Expense creation triggers notification
- [ ] Expense update triggers notification
- [ ] Creator does not receive their own notification
- [ ] Participants with disabled preferences don't receive
- [ ] Participants with enabled preferences receive
- [ ] Batch sending works correctly

---

### Task 3: Create Itinerary Notification Edge Function (2-3 hours)

**File:** `supabase/functions/send-itinerary-notification/index.ts`

**Trigger:** When itinerary item is created or updated
**Recipients:** All trip participants (except the creator)
**Event Type:** `itinerary`

**Payload Structure:**

```typescript
interface ItineraryPayload {
  type: 'INSERT' | 'UPDATE'
  table: 'itinerary_items'
  record: {
    id: string
    trip_id: string
    created_by: string
    type: 'flight' | 'accommodation' | 'activity'
    title: string
    start_date: string
    end_date?: string
  }
}
```

**Implementation Steps:**
(Similar to expense notification but with `itinerary` event type)

**Email Template:**

```html
Subject: Itinerary Updated for {trip.name} Hi {participant.name}, {creator.name} {action} a {type}
to {trip.name}: ✈️ {item.title} Date: {item.start_date} View itinerary: {tripUrl} --- Manage
notification preferences: {preferencesUrl}
```

**Testing:**

- [ ] Flight creation triggers notification
- [ ] Accommodation creation triggers notification
- [ ] Activity creation triggers notification
- [ ] Updates trigger notifications
- [ ] Preference checks work correctly

---

### Task 4: Create Chat Notification Edge Function (1-2 hours)

**File:** `supabase/functions/send-chat-notification/index.ts`

**Trigger:** When chat message is created
**Recipients:** All trip participants (except the sender)
**Event Type:** `chat`

**Note:** Chat notifications might be too noisy. Consider:

- Only notifying when user is mentioned (@username)
- Batching notifications (digest emails every hour)
- Making this opt-in by default

**Implementation Steps:**
(Similar pattern to expense/itinerary)

**Email Template:**

```html
Subject: New Message in {trip.name} Hi {participant.name}, {sender.name} sent a message in
{trip.name}: "{message.content}" Reply in chat: {tripUrl} --- Manage notification preferences:
{preferencesUrl}
```

**Testing:**

- [ ] Message creation triggers notification
- [ ] Sender doesn't receive their own notification
- [ ] Mentions work correctly (if implemented)
- [ ] Preference checks work correctly

---

### Task 5: Create Settlement Notification Edge Function (1-2 hours)

**File:** `supabase/functions/send-settlement-notification/index.ts`

**Trigger:** When settlement status changes (marked as paid)
**Recipients:** Both parties in the settlement
**Event Type:** `settlements`

**Payload Structure:**

```typescript
interface SettlementPayload {
  type: 'UPDATE'
  table: 'settlements'
  record: {
    id: string
    trip_id: string
    from_user_id: string
    to_user_id: string
    amount: number
    currency: string
    is_settled: boolean
  }
  old_record: {
    is_settled: boolean
  }
}
```

**Implementation Steps:**

1. Parse webhook payload
2. Only process if `is_settled` changed from false to true
3. Fetch settlement details with user and trip info
4. Check preferences for both parties
5. Send notifications to enabled recipients

**Email Template:**

```html
Subject: Settlement Marked as Paid in {trip.name} Hi {recipient.name}, A settlement has been marked
as paid in {trip.name}: 💰 {from_user.name} → {to_user.name} Amount: {amount} {currency} View
settlements: {tripUrl}/settlements --- Manage notification preferences: {preferencesUrl}
```

**Testing:**

- [ ] Settlement status change triggers notification
- [ ] Both parties receive notification (if enabled)
- [ ] Only status changes from unpaid→paid trigger
- [ ] Preference checks work for both parties

---

### Task 6: Create Database Triggers (1 hour)

**File:** `supabase/migrations/[timestamp]_add_notification_triggers.sql`

**Triggers to Create:**

```sql
-- Expense notifications
CREATE OR REPLACE FUNCTION notify_expense_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Call edge function
  PERFORM net.http_post(
    url := (SELECT current_setting('app.settings.functions_url') || '/send-expense-notification'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_notification_trigger
AFTER INSERT OR UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION notify_expense_change();

-- Itinerary notifications
CREATE OR REPLACE FUNCTION notify_itinerary_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := (SELECT current_setting('app.settings.functions_url') || '/send-itinerary-notification'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER itinerary_notification_trigger
AFTER INSERT OR UPDATE ON itinerary_items
FOR EACH ROW
EXECUTE FUNCTION notify_itinerary_change();

-- Chat notifications
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := (SELECT current_setting('app.settings.functions_url') || '/send-chat-notification'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_notification_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION notify_chat_message();

-- Settlement notifications
CREATE OR REPLACE FUNCTION notify_settlement_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify when is_settled changes from false to true
  IF TG_OP = 'UPDATE' AND OLD.is_settled = FALSE AND NEW.is_settled = TRUE THEN
    PERFORM net.http_post(
      url := (SELECT current_setting('app.settings.functions_url') || '/send-settlement-notification'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settlement_notification_trigger
AFTER UPDATE ON settlements
FOR EACH ROW
EXECUTE FUNCTION notify_settlement_change();
```

**Testing:**

- [ ] Triggers fire on appropriate events
- [ ] Edge functions are called correctly
- [ ] No performance degradation
- [ ] Rollback works correctly

---

### Task 7: Integration Testing (2-3 hours)

**Test Scenarios:**

1. **End-to-End Expense Notification**
   - [ ] Create expense
   - [ ] Verify email sent to participants with enabled preferences
   - [ ] Verify email NOT sent to participants with disabled preferences
   - [ ] Verify creator doesn't receive notification

2. **End-to-End Itinerary Notification**
   - [ ] Add flight to itinerary
   - [ ] Verify notifications sent based on preferences
   - [ ] Test with different item types

3. **End-to-End Chat Notification**
   - [ ] Send chat message
   - [ ] Verify notifications sent based on preferences
   - [ ] Verify sender doesn't receive notification

4. **End-to-End Settlement Notification**
   - [ ] Mark settlement as paid
   - [ ] Verify both parties notified (if enabled)
   - [ ] Verify other status changes don't trigger

5. **Preference Inheritance**
   - [ ] Test with NULL trip preferences (should inherit global)
   - [ ] Test with explicit trip preferences (should override global)
   - [ ] Test with mixed preferences

6. **Performance Testing**
   - [ ] Test with trip having 50+ participants
   - [ ] Verify batch email sending works
   - [ ] Check notification latency (<5 seconds)

**Test File:** `apps/web/tests/integration/notifications-e2e.test.ts`

---

## Deployment Checklist

- [ ] All edge functions deployed to Supabase
- [ ] Database triggers created in production
- [ ] Environment variables configured:
  - [ ] `RESEND_API_KEY`
  - [ ] `FRONTEND_URL`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Test notifications in production with test trip
- [ ] Monitor Supabase logs for errors
- [ ] Monitor Resend dashboard for email delivery

---

## Success Criteria

- [ ] All 4 new edge functions created and deployed
- [ ] Existing edge function updated with preference checks
- [ ] Database triggers created and active
- [ ] Integration tests passing
- [ ] Manual testing complete across all scenarios
- [ ] No performance degradation
- [ ] Error logging and monitoring in place
- [ ] Documentation updated

---

## Risk Mitigation

**Risk:** Email spam (too many notifications)
**Mitigation:**

- Make chat notifications opt-in by default
- Consider rate limiting (max 10 emails/hour per user)
- Batch notifications (digest emails)

**Risk:** Notification delays
**Mitigation:**

- Keep edge functions lightweight
- Use batch email sending for multiple recipients
- Monitor performance metrics

**Risk:** Failed email delivery
**Mitigation:**

- Implement retry logic in edge functions
- Log all failures to Sentry
- Monitor Resend API status

**Risk:** Database trigger performance
**Mitigation:**

- Use async triggers (AFTER not BEFORE)
- Test with large datasets
- Monitor query performance

---

## Next Steps After Phase 4

Once Phase 4 is complete, move to **Phase 5: Final Polish**:

1. E2E tests for full user workflows
2. Update CLAUDE.md documentation
3. Code review and refactoring
4. Performance optimization
5. Production readiness check

---

**Estimated Total Time:** 12-16 hours (1.5-2 days)
**Status:** Ready to implement
**Dependencies:** None (all prerequisites complete)
