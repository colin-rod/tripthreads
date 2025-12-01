# TripThreads Chat - Quick Setup Guide

## ⚡ Quick Start (5 minutes)

### Step 1: Create Supabase Storage Bucket

**Via Supabase Dashboard:**

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Storage** in sidebar
4. Click **"New bucket"**
5. Enter bucket name: `chat-attachments`
6. Set **Public**: ✅ Yes
7. Click **"Create bucket"**

**Via SQL (Alternative):**

```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);
```

### Step 2: Add Storage RLS Policies

Go to **Storage** > **Policies** > **New policy** for `chat-attachments`:

**Policy 1: Allow uploads**

```sql
CREATE POLICY "Trip participants can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT trip_id::text FROM trip_participants WHERE user_id = auth.uid()
  )
);
```

**Policy 2: Allow reads**

```sql
CREATE POLICY "Trip participants can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT trip_id::text FROM trip_participants WHERE user_id = auth.uid()
  )
);
```

### Step 3: Verify Environment Variables

Check `.env.local` has:

```bash
# OpenAI (already set)
OPENAI_API_KEY=sk-...

# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Step 4: Start the App

```bash
npm run dev
```

Navigate to: `http://localhost:3000/trips/[trip-id]/chat`

---

## ✅ Testing Checklist

### Test 1: Simple Expense

```
@TripThread add dinner €60 split 4 ways
```

- [ ] Modal opens with expense form
- [ ] Amount shows 60.00
- [ ] Currency is EUR
- [ ] Description is "dinner"
- [ ] Confirm → Bot responds
- [ ] Message appears in chat

### Test 2: Simple Itinerary

```
@TripThread museum visit tomorrow 2pm
```

- [ ] Modal opens with itinerary form
- [ ] Type is "activity"
- [ ] Title is "Museum visit"
- [ ] Start date is tomorrow at 2pm
- [ ] Confirm → Bot responds

### Test 3: Dual (Hotel)

```
@TripThread Hotel Marriott €200 check-in Dec 15 3pm
```

- [ ] Modal opens with BOTH tabs
- [ ] Expense tab shows €200
- [ ] Itinerary tab shows hotel stay
- [ ] Can confirm both or uncheck one
- [ ] Bot responds with both items

### Test 4: Multiple Commands

```
@TripThread add dinner €60 @TripThread add taxi £20
```

- [ ] First modal opens (dinner)
- [ ] Confirm → Second modal opens (taxi)
- [ ] Confirm → Two bot responses
- [ ] Shows "(1 of 2)" and "(2 of 2)"

### Test 5: File Upload

- [ ] Click paperclip button
- [ ] Select image/PDF
- [ ] Upload completes (see preview)
- [ ] Send message
- [ ] Attachment displays inline
- [ ] Can download document

### Test 6: Real-time

- [ ] Open chat in two browser tabs
- [ ] Send message in tab 1
- [ ] Message appears instantly in tab 2
- [ ] No page refresh needed

### Test 7: Navigation

- [ ] Sidebar shows: Home, Chat, Plan, Expenses, Settings
- [ ] Chat is highlighted when on /chat
- [ ] Plan page shows itinerary input
- [ ] Expenses page shows expense input
- [ ] Settings shows trip info

---

## 🐛 Troubleshooting

### "Failed to upload attachment"

**Fix:** Create the `chat-attachments` bucket in Supabase Storage

### "OpenAI API key not configured"

**Fix:** Add `OPENAI_API_KEY` to `.env.local`

### "Failed to send message"

**Fix:** Check database migration was applied:

```bash
supabase db push
```

### "You must be a trip participant"

**Fix:** Ensure you're logged in as a user who is a participant of the trip

### Messages don't appear in real-time

**Fix:** Check Supabase Realtime is enabled for the `chat_messages` table

### Bot messages don't appear

**Fix:** Check `createBotMessage` has service role permissions

---

## 📊 Monitoring

### Check Chat Messages

```sql
-- In Supabase SQL Editor
SELECT
  id,
  message_type,
  content,
  user_id,
  created_at
FROM chat_messages
WHERE trip_id = 'YOUR_TRIP_ID'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Storage Usage

```sql
SELECT
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint / 1024 / 1024 as total_mb
FROM storage.objects
WHERE bucket_id = 'chat-attachments';
```

### Check OpenAI Usage

- Go to: https://platform.openai.com/usage
- Monitor tokens used and costs

---

## 🚀 Next Steps

Once basic testing is complete:

1. **Write Tests**
   - Unit tests for parse-mentions.ts
   - Component tests for ChatMessage, ChatInput
   - E2E test for full chat flow

2. **Refine UX**
   - Add loading skeletons
   - Improve error messages
   - Add success animations

3. **Mobile Optimization**
   - Make sidebar responsive
   - Add hamburger menu
   - Test on mobile devices

4. **Performance**
   - Add pagination for old messages
   - Optimize real-time subscriptions
   - Add message caching

---

## 📞 Support

If you encounter issues:

1. Check [CHAT_IMPLEMENTATION_SUMMARY.md](./CHAT_IMPLEMENTATION_SUMMARY.md) for details
2. Review [CLAUDE.md](./CLAUDE.md) for project structure
3. Check Supabase logs for errors
4. Review browser console for client-side errors

**Status:** ✅ Ready for Testing
**Last Updated:** 2025-11-07
