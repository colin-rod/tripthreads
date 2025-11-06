# Deployment Guide - Viewer Role Permissions (CRO-798)

## Prerequisites

- [x] Code committed and pushed to `development` branch
- [x] Database migration file created
- [x] Resend API key added to environment variables
- [ ] Edge function deployed
- [ ] Production environment variables configured

---

## 1. Deploy Edge Function

The edge function sends email notifications when viewers request edit access.

### Option A: Via Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → Your Project → Edge Functions
2. Click "Create a new function"
3. Name: `send-access-request-email`
4. Copy the contents of [supabase/functions/send-access-request-email/index.ts](supabase/functions/send-access-request-email/index.ts)
5. Paste and save

### Option B: Via Supabase CLI

```bash
# Link to your Supabase project (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
npx supabase functions deploy send-access-request-email
```

---

## 2. Set Environment Variables

### Edge Function Environment Variables

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
FRONTEND_URL=https://tripthreads.com  # or your staging URL
```

### Vercel Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add the same variables if not already set:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Create Database Trigger

The edge function needs to be triggered when a new access request is created.

### In Supabase Dashboard → SQL Editor:

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_send_access_request_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function via pg_net (or supabase_functions extension)
  PERFORM
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-access-request-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'access_requests',
        'record', to_jsonb(NEW)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_access_request_created
  AFTER INSERT ON access_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_send_access_request_email();
```

**Note:** Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

**Alternative (Simpler):** You can also set up webhooks in Supabase Dashboard:

- Go to Database → Webhooks
- Create webhook for `access_requests` table
- Event: `INSERT`
- URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-access-request-email`

---

## 4. Verify Deployment

### Test the Complete Flow:

1. **Create a test trip as Owner**
   - Navigate to `/trips/new`
   - Create a trip

2. **Invite someone as Viewer**
   - Click "Invite" button
   - Select "Viewer" role
   - Generate invite link
   - Open link in incognito/different browser

3. **As Viewer, request edit access**
   - Try to add an itinerary item (should be disabled)
   - Click on disabled button
   - Modal should appear: "Permission Required"
   - Click "Request Edit Access"
   - Button should change to "Request Sent"

4. **Check Organizer notifications**
   - **In-app:** Organizer should see access request in trip page (if AccessRequestsList is added)
   - **Email:** Organizer should receive email with approve/reject buttons

5. **Test email links**
   - Click "Approve" in email
   - Should redirect to trip page with success message
   - Viewer should now be upgraded to Participant
   - Verify they can now edit itinerary

---

## 5. Integration Points to Complete

The following components have been created but need to be integrated into existing pages:

### Add AccessRequestsList to Trip Detail Page

In [apps/web/app/(app)/trips/[id]/page.tsx](<apps/web/app/(app)/trips/[id]/page.tsx>):

```typescript
// Add this after the PendingInvitesList component

// Fetch access requests (add to the page component)
const { data: accessRequests } = await supabase
  .from('access_requests')
  .select(`
    id,
    user_id,
    requested_at,
    user:users!access_requests_user_id_fkey (
      id,
      full_name,
      avatar_url,
      email
    )
  `)
  .eq('trip_id', params.id)
  .eq('status', 'pending')

// Add the component in the JSX
{isOwner && (
  <AccessRequestsList
    tripId={trip.id}
    requests={accessRequests || []}
    isOwner={isOwner}
  />
)}
```

### Wrap Protected Actions

For any buttons that should be disabled for viewers, wrap with `ProtectedAction`:

```tsx
import { ProtectedAction } from '@/components/features/permissions/ProtectedAction'

;<ProtectedAction canEdit={canEdit} action="add itinerary items" tripId={tripId}>
  <Button>Add Item</Button>
</ProtectedAction>
```

---

## 6. Post-Deployment Checklist

- [ ] Edge function deployed successfully
- [ ] Environment variables set in Supabase
- [ ] Environment variables set in Vercel
- [ ] Database trigger created
- [ ] Test email sent successfully
- [ ] Approve link works
- [ ] Reject link works
- [ ] User role upgraded after approval
- [ ] AccessRequestsList integrated (optional)
- [ ] ProtectedAction wrappers added where needed (optional)

---

## 7. Monitoring

### Check Edge Function Logs

In Supabase Dashboard → Edge Functions → send-access-request-email → Logs

Look for:

- Successful invocations
- Email send confirmations
- Any errors

### Check Database

```sql
-- View all access requests
SELECT * FROM access_requests ORDER BY created_at DESC;

-- View pending requests
SELECT * FROM access_requests WHERE status = 'pending';

-- View requests for a specific trip
SELECT
  ar.*,
  u.full_name as requester_name,
  u.email as requester_email,
  t.name as trip_name
FROM access_requests ar
JOIN users u ON ar.user_id = u.id
JOIN trips t ON ar.trip_id = t.id
WHERE ar.trip_id = 'YOUR_TRIP_ID'
ORDER BY ar.created_at DESC;
```

---

## 8. Rollback Plan

If something goes wrong:

### Rollback Database Migration

```sql
-- Run the rollback migration
-- Contents of: supabase/migrations/20250131000001_create_access_requests_rollback.sql
```

### Delete Edge Function

In Supabase Dashboard → Edge Functions → send-access-request-email → Delete

### Revert Code Changes

```bash
git revert e9678af  # Revert the permissions commit
git push origin development
```

---

## 9. Production Deployment

Once tested in staging (`development` branch):

1. **Create PR to main**

   ```bash
   # On GitHub, create PR: development → main
   ```

2. **Review and merge**
   - Review all changes
   - Ensure tests pass
   - Merge to main

3. **Deploy to production**
   - Vercel will auto-deploy from `main` branch
   - Repeat edge function deployment for production
   - Set production environment variables

4. **Apply migration to production database**
   - In Supabase Dashboard (Production) → SQL Editor
   - Run: `supabase/migrations/20250131000001_create_access_requests.sql`

---

## Troubleshooting

### Email not sending

- Check RESEND_API_KEY is correct
- Check edge function logs for errors
- Verify email is sent to correct organizer
- Check Resend dashboard for delivery status

### Approve/Reject links not working

- Check API route logs in Vercel
- Verify user is authenticated
- Check RLS policies on access_requests table
- Ensure user is the trip owner

### Modal not appearing

- Check browser console for errors
- Verify ProtectedAction wrapper is used
- Check that canEdit is correctly calculated
- Ensure modal state is managed

### Tests failing

```bash
# Run tests locally
npm test role-checks
npm test PermissionDeniedModal

# Check for linting errors
npm run lint

# Fix linting errors
npm run lint -- --fix
```

---

## Support

For issues or questions:

- Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for detailed implementation docs
- Check [apps/web/lib/permissions/README.md](apps/web/lib/permissions/README.md) for usage patterns
- Review Linear issue: CRO-798

---

**Deployment Status:** Ready for staging deployment
**Last Updated:** November 6, 2025
**Deployed By:** _[Your name]_
