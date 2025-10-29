# Supabase Email Setup for Trip Invites

This guide explains how to configure Supabase to send email invitations automatically.

## Current State

✅ **Implemented:**

- Email invite creation in database
- Invite tokens generation
- Email parsing and validation
- Batch email processing

⏳ **Pending Supabase Email Configuration:**

- Automatic email delivery
- Email templates
- SMTP configuration

## Option 1: Supabase Auth Emails (Recommended for MVP)

Supabase provides built-in email functionality that can be configured in the Supabase Dashboard.

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to Authentication → Email Templates

2. **Configure SMTP Settings** (Optional - uses Supabase's SMTP by default)
   - Go to Project Settings → Auth → SMTP Settings
   - You can use Supabase's default SMTP or configure your own

3. **Create Custom Email Template**
   - Create a new template or modify existing ones
   - Template name: `trip_invitation`

4. **Email Template Example:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>You're Invited to {{ .TripName }}</title>
  </head>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #F97316; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0;">TripThreads</h1>
    </div>

    <div style="padding: 30px;">
      <h2>You're invited to join {{ .TripName }}!</h2>

      <p>{{ .InviterName }} has invited you to collaborate on their trip.</p>

      <p><strong>Trip Details:</strong></p>
      <ul>
        <li>Name: {{ .TripName }}</li>
        <li>Dates: {{ .StartDate }} - {{ .EndDate }}</li>
        <li>Your role: {{ .Role }}</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a
          href="{{ .InviteUrl }}"
          style="background: #F97316;
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 5px;
                      display: inline-block;"
        >
          Accept Invitation
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        This invitation was sent to {{ .Email }}. If you didn't expect this, you can safely ignore
        this email.
      </p>

      <p style="color: #666; font-size: 14px;">Or copy and paste this link: {{ .InviteUrl }}</p>
    </div>

    <div
      style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;"
    >
      <p>Sent by TripThreads - Make memories, not spreadsheets</p>
    </div>
  </body>
</html>
```

5. **Implement Edge Function for Sending**

Create: `supabase/functions/send-invite-email/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async req => {
  const { inviteId } = await req.json()

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Fetch invite details
  const { data: invite } = await supabaseClient
    .from('trip_invites')
    .select(
      `
      *,
      trips:trip_id (name, start_date, end_date),
      inviter:invited_by (full_name)
    `
    )
    .eq('id', inviteId)
    .single()

  if (!invite || !invite.email) {
    return new Response(JSON.stringify({ error: 'Invalid invite' }), { status: 400 })
  }

  // Generate invite URL
  const inviteUrl = `${Deno.env.get('PUBLIC_SITE_URL')}/invite/${invite.token}`

  // Send email using Supabase Auth
  const { error } = await supabaseClient.auth.admin.inviteUserByEmail(invite.email, {
    data: {
      trip_name: invite.trips.name,
      inviter_name: invite.inviter.full_name,
      role: invite.role,
      invite_url: inviteUrl,
      start_date: invite.trips.start_date,
      end_date: invite.trips.end_date,
    },
    redirectTo: inviteUrl,
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

6. **Update `resendEmailInvite()` function**

In `packages/shared/lib/supabase/queries/invites.ts`:

```typescript
export async function resendEmailInvite(
  supabase: SupabaseClient<Database>,
  inviteId: string
): Promise<void> {
  const { data: invite, error } = await supabase
    .from('trip_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('invite_type', 'email')
    .eq('status', 'pending')
    .single()

  if (error || !invite) {
    throw new Error('Invite not found or cannot be resent')
  }

  // Call Edge Function to send email
  const { error: functionError } = await supabase.functions.invoke('send-invite-email', {
    body: { inviteId },
  })

  if (functionError) {
    throw new Error('Failed to send email invitation')
  }
}
```

## Option 2: Resend (Production-Ready Alternative)

For better deliverability, templates, and analytics, consider using Resend.

### Steps:

1. **Sign up for Resend**
   - Go to https://resend.com
   - Get API key

2. **Add to Environment Variables**

```bash
RESEND_API_KEY=re_xxx
```

3. **Install Resend in Edge Function**

```typescript
import { Resend } from 'https://esm.sh/resend@1.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const { data, error } = await resend.emails.send({
  from: 'TripThreads <invites@tripthreads.com>',
  to: [invite.email],
  subject: `You're invited to ${invite.trips.name}!`,
  html: renderEmailTemplate(invite), // Your HTML template
})
```

## Testing Email Invites

### Without Email Configuration (Current State):

1. Create email invite via UI
2. Invite is stored in database with token
3. Copy invite URL from PendingInvitesList
4. Manually send URL to recipient
5. Recipient clicks link → accepts invite

### With Email Configuration:

1. Create email invite via UI
2. Edge Function automatically sends email
3. Recipient receives email
4. Clicks button → accepts invite

## Rate Limiting

Current limits:

- 100 invites per trip per day
- 50 emails per batch

To modify, update:

- `supabase/migrations/20250129000007_create_trip_invites.sql` (v_max_per_day)
- `packages/shared/lib/validation/invite.ts` (max batch size)

## Troubleshooting

**Email not sending:**

- Check SMTP configuration in Supabase Dashboard
- Verify Edge Function is deployed
- Check Edge Function logs
- Ensure RESEND_API_KEY is set (if using Resend)

**Invite tokens not working:**

- Verify RLS policies are correct
- Check token is 32 characters
- Ensure status is 'pending'

**Rate limit errors:**

- Check `invite_rate_limits` table
- Wait 24 hours or increase limit

## Next Steps

1. Choose email provider (Supabase Auth or Resend)
2. Configure email templates
3. Deploy Edge Function
4. Update `resendEmailInvite()` implementation
5. Test email delivery
6. Monitor email delivery rates

## Resources

- [Supabase Auth Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend Documentation](https://resend.com/docs)
