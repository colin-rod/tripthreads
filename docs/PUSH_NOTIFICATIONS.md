# Push Notifications Documentation

**Last Updated:** January 2026
**Status:** ✅ Production Ready (Phase 4 Complete)

---

## Overview

TripThreads implements a comprehensive push notification system for both web and mobile platforms. Users receive instant notifications about trip events including invites, expenses, itinerary changes, chat messages, photos, and settlements.

### Key Features

- ✅ Multi-platform support (Web via VAPID, Mobile via Expo)
- ✅ 6 notification event types
- ✅ Granular user preferences (global + per-event + trip-specific)
- ✅ Deep linking to relevant trip pages
- ✅ Comprehensive logging and error handling
- ✅ Token lifecycle management
- ✅ Preference inheritance system

---

## Architecture

### High-Level Flow

```
Database Event (INSERT/UPDATE)
  ↓
PostgreSQL Trigger
  ↓
Edge Function (Deno)
  ↓
Filter Recipients by Preferences
  ↓
Send Email + Send Push (Web + Mobile)
  ↓
Log Notification Results
```

### Components

#### Database Layer

**Profiles Table:**

- `push_token_web` (TEXT) - JSON stringified PushSubscription object
- `push_token_mobile` (TEXT) - Expo push token string
- `push_token_web_updated_at` (TIMESTAMP)
- `push_token_mobile_updated_at` (TIMESTAMP)

**Notification Preferences:**

- `notification_preferences` (JSONB) - Stores user preferences
- Keys: `push_trip_invites`, `push_expense_updates`, `push_trip_updates`

**Trip Notification Preferences:**

- `trip_notification_preferences` (JSONB) - Trip-specific overrides
- Inherits from global preferences by default

#### Web Push Implementation

**Service Worker** (`/apps/web/public/sw.js`)

- Handles `push` events from VAPID server
- Displays notifications with custom payload
- Handles `notificationclick` for deep linking

**Push Subscription Hook** (`/apps/web/lib/hooks/use-push-subscription.ts`)

- Manages subscription lifecycle
- Handles permission requests
- Saves tokens to database

**Server Actions** (`/apps/web/app/actions/push-notifications.ts`)

- `updatePushToken()` - Save token to profiles
- `clearPushToken()` - Remove token from profiles
- `getPushTokenStatus()` - Check current token status

#### Mobile Push Implementation

**Push Hook** (`/apps/mobile/lib/hooks/use-push-notifications.ts`)

- Requests notification permissions
- Registers for Expo push tokens
- Handles foreground/background notifications
- Implements deep linking

**API Functions** (`/apps/mobile/lib/api/push-notifications.ts`)

- `updatePushToken()` - Save mobile token
- `clearPushToken()` - Remove mobile token

#### Edge Functions

**Shared Utilities** (`/supabase/functions/_shared/push.ts`)

```typescript
// Send web push via VAPID
sendWebPush(subscription: WebPushSubscription, payload: PushPayload): Promise<void>

// Send mobile push via Expo
sendMobilePush(expoPushToken: string, payload: PushPayload): Promise<ExpoPushTicket[]>

// Format push payload for specific event types
formatPushPayload(
  eventType: string,
  tripName: string,
  actorName: string,
  details: Record<string, string>
): { title: string; body: string }
```

**Updated Edge Functions** (All 6):

1. `send-expense-notification` - New expenses added
2. `send-chat-notification` - Chat messages posted
3. `send-itinerary-notification` - Itinerary changes
4. `send-settlement-notification` - Settlement status updates
5. `send-invite-accepted-notification` - New trip members
6. `send-access-request-email` - Access requests for trips

**Pattern:**

```typescript
// 1. Filter recipients for push notifications
const toNotifyPush = await filterRecipientsAndLog(
  supabase,
  tripId,
  participants,
  'expenses', // event type
  'push',     // notification channel
  metadata
)

// 2. Send push to each recipient
for (const participant of toNotifyPush) {
  const payload = formatPushPayload(...)

  // Send web push if token exists
  if (recipient.push_token_web) {
    await sendWebPush(JSON.parse(recipient.push_token_web), payload)
  }

  // Send mobile push if token exists
  if (recipient.push_token_mobile) {
    await sendMobilePush(recipient.push_token_mobile, payload)
  }
}
```

---

## Setup Instructions

### 1. Generate VAPID Keys (Web Push)

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local`:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BP...
VAPID_PRIVATE_KEY=...
```

Also add to:

- Vercel environment variables (production/staging)
- Supabase Edge Function secrets (`supabase secrets set`)

### 2. Configure Expo Push (Mobile)

**Get Expo Project ID:**

1. Run `eas init` in mobile directory
2. Note the project ID from `app.json`

Update in `/apps/mobile/lib/hooks/use-push-notifications.ts`:

```typescript
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-expo-project-id', // Replace with actual project ID
})
```

**Optional: Get Expo Access Token** (for server-side sending)

1. Go to https://expo.dev
2. Account Settings → Access Tokens
3. Generate token and add to `.env.local`:

```bash
EXPO_PUSH_KEY=xxx
```

### 3. Database Migration

The migration is already applied. It added:

- `push_token_web` column
- `push_token_mobile` column
- Timestamp columns for token updates
- Indexes for token lookups

**File:** `/supabase/migrations/20260102000000_add_push_tokens.sql`

### 4. Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy send-expense-notification
supabase functions deploy send-chat-notification
supabase functions deploy send-itinerary-notification
supabase functions deploy send-settlement-notification
supabase functions deploy send-invite-accepted-notification
supabase functions deploy send-access-request-email
```

---

## User Experience Flow

### Web Push Subscription

1. **User logs in** → App loads
2. **Service worker registers** automatically in root layout
3. **Push subscription prompt appears** (dismissable)
4. **User clicks "Enable Notifications"**
5. **Browser requests permission** → User grants
6. **Push subscription created** via PushManager API
7. **Token saved to database** (`push_token_web`)
8. **Prompt auto-dismisses**

### Mobile Push Registration

1. **User opens mobile app**
2. **App requests notification permission** on launch
3. **User grants permission**
4. **Expo push token generated**
5. **Token saved to database** (`push_token_mobile`)
6. **Notification channel configured** (Android)

### Receiving Notifications

1. **Database event occurs** (e.g., new expense)
2. **PostgreSQL trigger fires**
3. **Edge function receives webhook**
4. **Recipients filtered by preferences**
5. **Push sent to web and/or mobile**
6. **User sees notification**
7. **User taps notification** → Deep link opens trip page
8. **Event logged in `notification_logs`**

---

## User Preferences

### Global Preferences

**Location:** Settings → Notifications

Users can toggle push notifications globally for:

- Trip invitations (`push_trip_invites`)
- Expense updates (`push_expense_updates`)
- Trip updates (`push_trip_updates`)

**Default:** All enabled (true)

### Trip-Specific Overrides

**Location:** Trip Settings → Notifications

Users can override global preferences per trip:

- If not set → Inherits from global
- If set → Overrides global for this trip
- Can reset to global default

### Per-Event Granularity

The preference system supports 6 event types:

1. **Invites** - Trip invitations
2. **Itinerary** - Itinerary changes
3. **Expenses** - New expenses
4. **Photos** - New photos uploaded
5. **Chat** - Chat messages
6. **Settlements** - Settlement status changes

**Mapping:**

- `push_trip_invites` → Invites
- `push_trip_updates` → Itinerary, Photos, Chat
- `push_expense_updates` → Expenses, Settlements

---

## Payload Structure

### Web Push Payload

```typescript
interface PushPayload {
  title: string // Notification title
  body: string // Notification body text
  icon?: string // Icon URL
  badge?: string // Badge URL
  data: {
    url: string // Deep link URL
  }
  tag?: string // Notification tag (for grouping)
  requireInteraction?: boolean // Keep notification visible
}
```

**Example:**

```json
{
  "title": "💰 New expense in Tokyo Trip",
  "body": "Colin added \"Dinner at Ramen Shop\" - $45.00",
  "icon": "/icon-192.png",
  "badge": "/badge-72.png",
  "data": {
    "url": "https://tripthreads.app/trips/abc123/expenses"
  },
  "tag": "expense-xyz789",
  "requireInteraction": false
}
```

### Mobile Push Payload (Expo)

```typescript
interface ExpoPushMessage {
  to: string // Expo push token
  sound?: 'default' // Notification sound
  title: string // Notification title
  body: string // Notification body
  data?: {
    url: string // Deep link URL
  }
  badge?: number // Badge count
  priority?: 'default' | 'high'
  channelId?: string // Android channel ID
}
```

**Example:**

```json
{
  "to": "ExponentPushToken[xxx]",
  "sound": "default",
  "title": "💰 New expense in Tokyo Trip",
  "body": "Colin added \"Dinner at Ramen Shop\" - $45.00",
  "data": {
    "url": "tripthreads://trips/abc123/expenses"
  },
  "priority": "high",
  "channelId": "default"
}
```

---

## Deep Linking

### Web Deep Links

Format: `https://tripthreads.app/trips/{tripId}?tab={tab}`

**Examples:**

- Expenses: `/trips/abc123?tab=expenses`
- Chat: `/trips/abc123?tab=chat`
- Itinerary: `/trips/abc123?tab=itinerary`
- Photos: `/trips/abc123?tab=photos`
- Settlements: `/trips/abc123?tab=expenses` (same as expenses)

**Implementation:**

```javascript
// In service worker (sw.js)
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data.url
  event.waitUntil(clients.openWindow(url))
})
```

### Mobile Deep Links

Format: `tripthreads://trips/{tripId}?tab={tab}`

**Expo Router Integration:**

```typescript
// In use-push-notifications.ts
Notifications.addNotificationResponseReceivedListener(response => {
  const url = response.notification.request.content.data.url
  if (url) {
    const urlObj = new URL(url)
    const path = urlObj.pathname
    router.push(path)
  }
})
```

---

## Error Handling

### Common Errors

**1. Permission Denied**

- User denied notification permission
- Show toast: "Permission denied. Enable in Settings."
- Don't retry automatically

**2. Token Registration Failed**

- Network error during token generation
- Log error and retry on next app launch
- Don't block user experience

**3. Push Send Failed**

- Invalid token (expired/revoked)
- Log failure in `notification_logs`
- Clear token from database
- User will be re-prompted on next login

**4. Service Worker Not Supported**

- Browser doesn't support service workers
- Gracefully degrade to email-only
- Don't show push subscription prompt

### Error Logging

All push attempts are logged in `notification_logs`:

```typescript
await logNotification(supabase, {
  trip_id: tripId,
  user_id: userId,
  event_type: 'expenses',
  notification_type: 'push',
  status: 'failed',
  error_message: error.message,
  metadata: {
    platform: 'web',
    expense_id: expenseId,
  },
})
```

**Statuses:**

- `sent` - Successfully sent
- `failed` - Send failed
- `skipped` - User opted out via preferences

---

## Testing

### Local Testing (Web)

1. **Start local Supabase:**

   ```bash
   supabase start
   ```

2. **Start development server:**

   ```bash
   npm run dev
   ```

3. **Open browser console**
4. **Navigate to Settings → Notifications**
5. **Enable push notifications**
6. **Grant permission when prompted**
7. **Check database for token:**

   ```sql
   SELECT push_token_web FROM profiles WHERE id = 'user-id';
   ```

8. **Trigger test notification:**
   - Create expense in a trip
   - Check browser for notification
   - Click notification → Should navigate to expenses tab

### Local Testing (Mobile)

**Note:** Push notifications only work on physical devices, not simulators.

1. **Build development client:**

   ```bash
   cd apps/mobile
   eas build --profile development --platform ios
   ```

2. **Install on physical device**

3. **Open app and grant permission**

4. **Check database for token:**

   ```sql
   SELECT push_token_mobile FROM profiles WHERE id = 'user-id';
   ```

5. **Trigger test notification:**
   - Create expense from web app
   - Check mobile device for notification

### Testing Push Sending (Edge Functions)

**Supabase Edge Function Logs:**

```bash
supabase functions logs send-expense-notification --follow
```

**Manual Test via cURL:**

```bash
curl -X POST https://xxx.supabase.co/functions/v1/send-expense-notification \
  -H "Authorization: Bearer xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "expenses",
    "record": {
      "id": "test-123",
      "trip_id": "trip-456",
      "created_by": "user-789",
      "description": "Test expense",
      "amount": 1000,
      "currency": "USD"
    }
  }'
```

---

## Troubleshooting

### Web Push Issues

**Problem:** Subscription prompt doesn't appear

**Solutions:**

- Check browser console for errors
- Verify service worker registered: DevTools → Application → Service Workers
- Verify VAPID key is set: `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Clear localStorage: `localStorage.removeItem('push-prompt-dismissed')`

**Problem:** Permission denied

**Solutions:**

- User must manually reset in browser settings
- Chrome: Site Settings → Notifications → Allow
- Safari: Preferences → Websites → Notifications → Allow

**Problem:** Notifications not received

**Solutions:**

- Check token is saved: Query `profiles.push_token_web`
- Check edge function logs for errors
- Verify user preferences are enabled
- Test with `webpush` CLI:
  ```bash
  npx web-push send-notification \
    --vapid-subject="mailto:notifications@tripthreads.app" \
    --vapid-pubkey="xxx" \
    --vapid-pvtkey="xxx" \
    '{"endpoint":"...","keys":{...}}' \
    '{"title":"Test","body":"Test notification"}'
  ```

### Mobile Push Issues

**Problem:** Token not generated

**Solutions:**

- Ensure running on physical device (not simulator)
- Check Expo project ID is correct
- Verify app.json has correct configuration
- Check app has notification permission

**Problem:** Notifications not received

**Solutions:**

- Check token is saved: Query `profiles.push_token_mobile`
- Verify Expo push token format: `ExponentPushToken[xxx]`
- Check Expo push status: https://expo.dev/notifications
- Test with Expo push tool:
  ```bash
  curl -H "Content-Type: application/json" \
    -X POST https://exp.host/--/api/v2/push/send \
    -d '{
      "to": "ExponentPushToken[xxx]",
      "title": "Test",
      "body": "Test notification"
    }'
  ```

**Problem:** Deep links not working

**Solutions:**

- Verify Expo linking configuration in `app.json`
- Check URL scheme matches: `tripthreads://`
- Test deep link manually: `npx uri-scheme open tripthreads://trips/abc123 --ios`

---

## Performance Considerations

### Rate Limiting

**Current Implementation:**

- No rate limiting on push sends (same user can receive multiple)
- Rate limiting exists on database triggers (prevents spam)

**Future Enhancements:**

- Batch push notifications (e.g., daily digest)
- Rate limit per user (max N pushes per hour)
- Smart bundling (group multiple events)

### Expo Push Limits

**Free Tier:**

- No explicit limit, but subject to fair use
- Expo may throttle excessive sends
- Batching recommended for >100 recipients

**Best Practices:**

- Use `expo.chunkPushNotifications()` for batching
- Handle receipts asynchronously (don't block)
- Retry failed sends with exponential backoff

### Token Expiration

**Web Push:**

- Tokens don't expire in most browsers
- Re-register on permission change
- Update timestamp on each app load

**Mobile Push:**

- Expo tokens may change
- Re-register on each app launch
- Update if token changes

---

## Security Considerations

### VAPID Keys

- **Never commit private key to Git**
- Store in environment variables only
- Rotate keys if compromised
- Use different keys for staging/production

### Expo Push Tokens

- Tokens are user-specific, not device-specific
- Clear token on logout
- Validate token format before sending
- Don't expose tokens in client logs

### Push Payload Sanitization

- Escape HTML in notification text
- Limit payload size (max 4KB for web push)
- Don't include sensitive data in notifications
- Use deep links instead of inline data

---

## Monitoring & Analytics

### Notification Logs

All push attempts are logged in `notification_logs`:

```sql
SELECT
  event_type,
  notification_type,
  status,
  COUNT(*) as count,
  AVG(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success_rate
FROM notification_logs
WHERE notification_type = 'push'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type, notification_type, status;
```

### Key Metrics

1. **Subscription Rate:** % of users who enable push
2. **Delivery Success Rate:** % of pushes successfully sent
3. **Click-Through Rate:** % of notifications clicked
4. **Opt-Out Rate:** % of users who disable push

### Sentry Integration

Push errors are automatically logged to Sentry:

- Token registration failures
- Permission denials
- Send failures
- Invalid token errors

---

## Future Enhancements

### Phase 5+

- [ ] Push notification batching/digests
- [ ] Rich notifications (images, actions)
- [ ] Notification scheduling
- [ ] A/B testing notification content
- [ ] Push notification analytics dashboard
- [ ] Web Push badge counts
- [ ] Sound customization
- [ ] Notification categories (iOS)
- [ ] Provisional permissions (iOS)
- [ ] Silent push for background sync

---

## References

### Documentation

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID Spec](https://datatracker.ietf.org/doc/html/rfc8291)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Service Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

### Libraries

- [web-push](https://github.com/web-push-libs/web-push) - Web push sending
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) - Expo push
- [expo-device](https://docs.expo.dev/versions/latest/sdk/device/) - Device detection

---

**Version:** 1.0
**Last Updated:** January 2026
**Status:** ✅ Production Ready
