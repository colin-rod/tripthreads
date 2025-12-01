# Permission System Documentation

## Overview

TripThreads uses a role-based access control (RBAC) system with three roles:

- **Owner (Organizer)** - Full access to all trip features
- **Participant** - Can edit itinerary, add expenses, upload photos
- **Viewer** - Read-only access with ability to request edit access

This directory contains utilities and components for managing permissions throughout the application.

---

## Role Hierarchy

```
Owner (Organizer)
  ↓ Can do everything
  ├─ Invite others
  ├─ Edit trip settings
  ├─ Delete trip
  └─ All Participant permissions

Participant
  ↓ Can edit content
  ├─ Add/edit itinerary items
  ├─ Add/track expenses
  ├─ Upload photos
  └─ View all trip content

Viewer
  ↓ Read-only
  ├─ View itinerary
  ├─ View photos
  └─ Request edit access
```

---

## Files in This Directory

### `role-checks.ts`

Core permission checking utilities used throughout the app.

**Key Functions:**

```typescript
// Check if user can edit content
canEditTrip(role?: TripRole): boolean

// Check if user is owner
isOwner(role?: TripRole): boolean

// Check if user is viewer
isViewer(role?: TripRole): boolean

// Check if user can view expenses (viewers cannot)
canViewExpenses(role?: TripRole): boolean

// Check if user can invite others (owners only)
canInviteOthers(role?: TripRole): boolean

// Get human-readable label
getRoleLabel(role?: TripRole): string

// Get role description
getRoleDescription(role?: TripRole): string

// Get tooltip text for disabled actions
getViewerTooltip(action: string): string
```

**Usage Example:**

```typescript
import { canEditTrip, isViewer } from '@/lib/permissions/role-checks'

// In a component
const userRole = userParticipant?.role
const canEdit = canEditTrip(userRole)

if (isViewer(userRole)) {
  // Show read-only UI
}
```

---

## Related Components

### Permission UI Components

#### `PermissionDeniedModal`

**Location:** `components/features/permissions/PermissionDeniedModal.tsx`

Modal that appears when viewers attempt restricted actions.

**Props:**

```typescript
interface PermissionDeniedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  actionAttempted: string // e.g., "add itinerary items"
}
```

**Features:**

- Lock icon for visual clarity
- Clear explanation of viewer limitations
- "Request Edit Access" button
- Changes to "Request Sent" after submission

**Usage:**

```tsx
import { PermissionDeniedModal } from '@/components/features/permissions/PermissionDeniedModal'

function MyComponent() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <PermissionDeniedModal
      open={modalOpen}
      onOpenChange={setModalOpen}
      tripId={tripId}
      actionAttempted="add itinerary items"
    />
  )
}
```

#### `ProtectedAction`

**Location:** `components/features/permissions/ProtectedAction.tsx`

Wrapper component that handles permission checks, tooltips, and modal display.

**Props:**

```typescript
interface ProtectedActionProps {
  children: ReactElement
  canEdit: boolean
  action: string
  tripId: string
  tooltipText?: string
}
```

**Usage:**

```tsx
import { ProtectedAction } from '@/components/features/permissions/ProtectedAction'

function MyComponent({ userRole, tripId }) {
  return (
    <ProtectedAction canEdit={canEditTrip(userRole)} action="add itinerary items" tripId={tripId}>
      <Button onClick={handleAdd}>Add Item</Button>
    </ProtectedAction>
  )
}
```

**Behavior:**

- If `canEdit` is `true`: renders children normally
- If `canEdit` is `false`:
  - Disables the button
  - Shows tooltip on hover
  - Opens permission denied modal on click

#### `AccessRequestsList`

**Location:** `components/features/permissions/AccessRequestsList.tsx`

Displays pending access requests for trip organizers.

**Props:**

```typescript
interface AccessRequestsListProps {
  tripId: string
  requests: AccessRequest[]
  isOwner: boolean
}
```

**Usage:**

```tsx
import { AccessRequestsList } from '@/components/features/permissions/AccessRequestsList'

function TripPage({ trip, isOwner }) {
  return (
    <>
      {isOwner && (
        <AccessRequestsList tripId={trip.id} requests={pendingAccessRequests} isOwner={isOwner} />
      )}
    </>
  )
}
```

**Features:**

- Shows list of users requesting edit access
- Approve/Reject buttons
- Real-time updates via page revalidation

---

## Server Actions

### Access Request Actions

**Location:** `app/actions/permissions.ts`

Server actions for managing access requests.

#### `requestEditAccess(tripId: string)`

Request viewer → participant upgrade.

**Usage:**

```typescript
import { requestEditAccess } from '@/app/actions/permissions'

async function handleRequest() {
  try {
    await requestEditAccess(tripId)
    // Request sent successfully
  } catch (error) {
    // Handle error
  }
}
```

#### `approveAccessRequest(requestId: string)`

Approve an access request and upgrade user to participant.

**Usage:**

```typescript
import { approveAccessRequest } from '@/app/actions/permissions'

async function handleApprove() {
  try {
    await approveAccessRequest(requestId)
    // User upgraded to participant
  } catch (error) {
    // Handle error
  }
}
```

#### `rejectAccessRequest(requestId: string)`

Reject an access request.

**Usage:**

```typescript
import { rejectAccessRequest } from '@/app/actions/permissions'

async function handleReject() {
  try {
    await rejectAccessRequest(requestId)
    // Request rejected
  } catch (error) {
    // Handle error
  }
}
```

---

## Database Schema

### `access_requests` Table

**Columns:**

- `id` (UUID) - Primary key
- `trip_id` (UUID) - Foreign key to trips
- `user_id` (UUID) - Foreign key to users (requester)
- `status` (enum) - 'pending', 'approved', 'rejected'
- `requested_at` (timestamp) - When request was made
- `responded_at` (timestamp, nullable) - When organizer responded
- `responded_by` (UUID, nullable) - Foreign key to users (organizer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**RLS Policies:**

1. Users can view their own requests
2. Users can create requests (if they're viewers)
3. Trip owners can view all requests for their trips
4. Trip owners can approve/reject requests

---

## Email Notifications

### Edge Function

**Location:** `supabase/functions/send-access-request-email/index.ts`

Sends email to trip organizer when viewer requests edit access.

**Triggered by:** Database trigger on `access_requests` INSERT

**Email includes:**

- Trip name and details
- Requester information
- Approve button (direct link)
- Reject button (direct link)
- Link to trip page

**Required Environment Variables:**

- `RESEND_API_KEY` - Resend API key
- `FRONTEND_URL` - Base URL of application
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

---

## Testing

### Unit Tests

**Location:** `__tests__/lib/permissions/role-checks.test.ts`

Tests all permission utility functions.

**Run tests:**

```bash
npm test role-checks
```

### Component Tests

**Location:** `__tests__/components/permissions/PermissionDeniedModal.test.tsx`

Tests permission denied modal behavior.

**Run tests:**

```bash
npm test PermissionDeniedModal
```

---

## Common Patterns

### Pattern 1: Conditional Rendering Based on Role

```typescript
import { canEditTrip } from '@/lib/permissions/role-checks'

function MyComponent({ userRole }) {
  const canEdit = canEditTrip(userRole)

  return (
    <>
      {canEdit ? (
        <AddItemButton />
      ) : (
        <ViewOnlyMessage />
      )}
    </>
  )
}
```

### Pattern 2: Protected Action Button

```tsx
import { ProtectedAction } from '@/components/features/permissions/ProtectedAction'
import { canEditTrip } from '@/lib/permissions/role-checks'

function MyComponent({ userRole, tripId }) {
  return (
    <ProtectedAction canEdit={canEditTrip(userRole)} action="delete item" tripId={tripId}>
      <Button variant="destructive">Delete</Button>
    </ProtectedAction>
  )
}
```

### Pattern 3: Checking Permission in Server Action

```typescript
import { createClient } from '@/lib/supabase/server'

export async function deleteItem(itemId: string) {
  const supabase = await createClient()

  // Get user and their role
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: participant } = await supabase
    .from('trip_participants')
    .select('role')
    .eq('user_id', user?.id)
    .single()

  // Check permission
  if (participant?.role === 'viewer') {
    throw new Error('Viewers cannot delete items')
  }

  // Proceed with deletion...
}
```

### Pattern 4: Fetching and Displaying Access Requests

```typescript
import { createClient } from '@/lib/supabase/server'
import { AccessRequestsList } from '@/components/features/permissions/AccessRequestsList'

async function TripPage({ params }) {
  const supabase = await createClient()

  // Fetch pending access requests
  const { data: requests } = await supabase
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

  return (
    <AccessRequestsList
      tripId={params.id}
      requests={requests || []}
      isOwner={isOwner}
    />
  )
}
```

---

## Best Practices

1. **Always check permissions on both client and server**
   - Client-side for UX (disable buttons, show tooltips)
   - Server-side for security (enforce in server actions)

2. **Use RLS policies as the source of truth**
   - Database-level security cannot be bypassed
   - UI checks are for user experience only

3. **Provide clear feedback**
   - Use tooltips to explain why actions are disabled
   - Show permission denied modal with actionable next steps

4. **Allow viewers to request access**
   - Don't leave viewers feeling stuck
   - Provide "Request Edit Access" flow

5. **Test permission boundaries**
   - Write tests for all permission checks
   - Test edge cases (undefined roles, etc.)

---

## Troubleshooting

### Viewers can still perform actions they shouldn't

- Check RLS policies in database
- Verify server actions check permissions
- Ensure client-side checks use correct role

### Permission denied modal not appearing

- Verify `ProtectedAction` wrapper is used
- Check that `canEdit` prop is correctly set
- Ensure modal state is managed properly

### Access requests not sending

- Check `requestEditAccess` server action
- Verify user is authenticated
- Check RLS policies on `access_requests` table
- Ensure user is actually a viewer on the trip

### Email notifications not working

- Verify `RESEND_API_KEY` is set
- Check edge function logs in Supabase
- Ensure edge function is deployed
- Verify email service is configured

---

## Future Enhancements

- [ ] Real-time notifications via Supabase Realtime
- [ ] In-app notification center
- [ ] Notification preferences (email, push, in-app)
- [ ] Bulk approve/reject for access requests
- [ ] Access request expiration
- [ ] Audit log for role changes

---

**Last Updated:** November 6, 2025
**Related Issues:** CRO-798, CRO-834
