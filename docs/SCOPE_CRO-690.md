# CRO-690: Trip CRUD (create/edit/delete) with Date Range

**Linear Task:** CRO-690
**Parent Epic:** E3 - Trip Creation
**Phase:** P1
**Points:** 5
**Status:** Scoping

---

## Overview

Implement the core trip lifecycle management functionality, allowing users to create, read, update, and delete trips with name, description, and date range (start_date, end_date). This is the foundational feature that enables all other trip-related functionality.

**User Story:**

> As a trip organizer, I want to create a new trip with basic details (name, dates, description) so that I can start inviting participants and planning activities.

---

## Acceptance Criteria

✅ Trip lifecycle works: CREATE, READ, UPDATE, DELETE
✅ RLS enforced (owner-only edit/delete, participants can view)
✅ API + UI unit tests pass
✅ Date validation (end_date >= start_date)
✅ Trip list view shows user's trips
✅ Trip detail view loads correctly

---

## Technical Scope

### 1. Database Schema (Already Implemented ✅)

The `trips` table is already created in migration `20250129000001`:

```sql
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validation: end_date must be after start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);
```

**Indexes:**

- `idx_trips_owner_id` - Fast lookup by owner
- `idx_trips_start_date` - Sorting by trip date
- `idx_trips_created_at` - Recent trips query

**RLS Policies (Already Implemented ✅):**

- ✅ `"Users can read trips they participate in"` - SELECT policy
- ✅ `"Users can create trips"` - INSERT policy (owner_id = auth.uid())
- ✅ `"Users can update own trips"` - UPDATE policy (owner only)
- ✅ `"Users can delete own trips"` - DELETE policy (owner only)

**Status:** ✅ Schema and RLS are complete and tested (migrations 001, 005)

---

### 2. TypeScript Types (Already Implemented ✅)

Types are defined in `packages/shared/types/database.ts`:

```typescript
export interface Trip {
  id: string
  name: string
  description: string | null
  start_date: string // ISO 8601
  end_date: string // ISO 8601
  owner_id: string
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export type TripInsert = Omit<Trip, 'id' | 'created_at' | 'updated_at'>
export type TripUpdate = Partial<Omit<Trip, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
```

**Status:** ✅ Types are complete

---

### 3. API Layer (To Implement)

#### 3.1 Supabase Queries

Create: `packages/shared/lib/supabase/queries/trips.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database, Trip, TripInsert, TripUpdate } from '@/types/database'

export async function getUserTrips(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      *,
      trip_participants (
        id,
        role,
        user:users (
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .order('start_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getTripById(supabase: SupabaseClient<Database>, tripId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      *,
      owner:users!owner_id (
        id,
        full_name,
        avatar_url
      ),
      trip_participants (
        id,
        role,
        joined_at,
        user:users (
          id,
          full_name,
          avatar_url
        )
      )
    `
    )
    .eq('id', tripId)
    .single()

  if (error) throw error
  return data
}

export async function createTrip(supabase: SupabaseClient<Database>, trip: TripInsert) {
  // 1. Insert trip
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .insert(trip)
    .select()
    .single()

  if (tripError) throw tripError

  // 2. Auto-add owner as participant with 'owner' role
  const { error: participantError } = await supabase.from('trip_participants').insert({
    trip_id: tripData.id,
    user_id: trip.owner_id,
    role: 'owner',
    invited_by: trip.owner_id,
    joined_at: new Date().toISOString(),
  })

  if (participantError) throw participantError

  return tripData
}

export async function updateTrip(
  supabase: SupabaseClient<Database>,
  tripId: string,
  updates: TripUpdate
) {
  const { data, error } = await supabase
    .from('trips')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTrip(supabase: SupabaseClient<Database>, tripId: string) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId)

  if (error) throw error
}
```

**Validation Rules:**

1. **Name:** Required, 1-100 characters, trim whitespace
2. **Description:** Optional, max 500 characters
3. **Start Date:** Required, valid ISO 8601 timestamp
4. **End Date:** Required, must be >= start_date
5. **Owner ID:** Required, must match auth.uid() (enforced by RLS)

**Error Handling:**

- `400 Bad Request` - Validation errors (invalid dates, missing fields)
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - RLS policy violation (trying to edit someone else's trip)
- `404 Not Found` - Trip doesn't exist or user doesn't have access
- `409 Conflict` - Date validation failed (end_date < start_date)

---

### 4. UI Components (To Implement)

#### 4.1 Trip List Page

**Location:** `apps/web/app/(app)/trips/page.tsx`

**Features:**

- Display all trips user is a participant in
- Sort by start_date (descending - upcoming first)
- Show trip name, dates, participant count
- "Create New Trip" button
- Empty state when no trips

**Component Structure:**

```
TripsPage
├── TripsList
│   ├── TripCard (repeated)
│   │   ├── TripImage (cover_image_url or placeholder)
│   │   ├── TripInfo (name, dates)
│   │   ├── ParticipantAvatars (first 3 + count)
│   │   └── TripActions (view, edit if owner)
│   └── EmptyState
└── CreateTripButton (floating action button)
```

**shadcn/ui Components:**

- `Card` - Trip card container
- `Button` - Actions and create button
- `Badge` - Trip status (upcoming, ongoing, past)
- `Avatar` - Participant avatars
- `Dialog` - Create trip modal

#### 4.2 Create Trip Form

**Location:** `apps/web/components/features/trips/CreateTripDialog.tsx`

**Form Fields:**

1. **Trip Name** (Input)
   - Required
   - Max length: 100 characters
   - Placeholder: "e.g., Paris Summer 2025"

2. **Start Date** (DatePicker)
   - Required
   - Min: Today
   - Format: "MMM DD, YYYY"

3. **End Date** (DatePicker)
   - Required
   - Min: start_date
   - Format: "MMM DD, YYYY"
   - Validates >= start_date

4. **Description** (Textarea)
   - Optional
   - Max length: 500 characters
   - Placeholder: "What's this trip about?"

**Validation:**

- Client-side validation with Zod schema
- Real-time error messages
- Disable submit until valid
- Show loading state during submission

**shadcn/ui Components:**

- `Dialog` - Modal container
- `Form` - Form wrapper with validation
- `Input` - Text inputs
- `Textarea` - Description field
- `Calendar` - Date picker
- `Button` - Submit/Cancel

#### 4.3 Edit Trip Form

**Location:** `apps/web/components/features/trips/EditTripDialog.tsx`

**Same as Create Form, but:**

- Pre-populate existing values
- Show "Save Changes" instead of "Create Trip"
- Only accessible to trip owner
- Show "Cancel" to discard changes

#### 4.4 Trip Detail Page

**Location:** `apps/web/app/(app)/trips/[id]/page.tsx`

**Features:**

- Display trip name, dates, description
- Show owner and participants
- Edit button (owner only)
- Delete button (owner only, with confirmation)
- Tabs for: Timeline (default), Expenses, Feed, Settings

**Component Structure:**

```
TripDetailPage
├── TripHeader
│   ├── TripImage
│   ├── TripInfo (name, dates)
│   ├── OwnerInfo
│   └── TripActions (edit, delete)
├── TripDescription
├── ParticipantsList
└── TripTabs
    ├── TimelineTab
    ├── ExpensesTab
    ├── FeedTab
    └── SettingsTab
```

#### 4.5 Delete Confirmation Dialog

**Location:** `apps/web/components/features/trips/DeleteTripDialog.tsx`

**Features:**

- Warning message about data loss
- List what will be deleted:
  - All itinerary items
  - All expenses
  - All media files
  - All participant records
- Require typing trip name to confirm
- "Cancel" and "Delete Trip" buttons

---

### 5. Validation Schema (To Implement)

**Location:** `packages/shared/lib/validation/trip.ts`

```typescript
import { z } from 'zod'

export const createTripSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Trip name is required')
      .max(100, 'Trip name must be less than 100 characters')
      .trim(),

    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .optional()
      .nullable(),

    start_date: z
      .string()
      .datetime('Invalid start date')
      .refine(
        date => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
        'Start date cannot be in the past'
      ),

    end_date: z.string().datetime('Invalid end date'),

    owner_id: z.string().uuid('Invalid owner ID'),

    cover_image_url: z.string().url('Invalid image URL').optional().nullable(),
  })
  .refine(data => new Date(data.end_date) >= new Date(data.start_date), {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  })

export const updateTripSchema = createTripSchema
  .omit({ owner_id: true })
  .partial()
  .refine(
    data => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date)
      }
      return true
    },
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  )

export type CreateTripInput = z.infer<typeof createTripSchema>
export type UpdateTripInput = z.infer<typeof updateTripSchema>
```

---

### 6. Unit Tests (To Implement)

#### 6.1 API Tests

**Location:** `packages/shared/lib/supabase/queries/__tests__/trips.test.ts`

```typescript
describe('Trip Queries', () => {
  describe('getUserTrips', () => {
    it('returns all trips user is a participant in', async () => {
      // Test implementation
    })

    it('returns empty array when user has no trips', async () => {
      // Test implementation
    })

    it('orders trips by start_date descending', async () => {
      // Test implementation
    })
  })

  describe('getTripById', () => {
    it('returns trip with owner and participants', async () => {
      // Test implementation
    })

    it('throws error when trip not found', async () => {
      // Test implementation
    })

    it('throws error when user lacks access', async () => {
      // Test implementation
    })
  })

  describe('createTrip', () => {
    it('creates trip and adds owner as participant', async () => {
      // Test implementation
    })

    it('validates date range constraint', async () => {
      // Test implementation
    })

    it('throws error when end_date < start_date', async () => {
      // Test implementation
    })
  })

  describe('updateTrip', () => {
    it('updates trip fields', async () => {
      // Test implementation
    })

    it('throws error when non-owner tries to update', async () => {
      // Test implementation
    })

    it('validates date range on update', async () => {
      // Test implementation
    })
  })

  describe('deleteTrip', () => {
    it('deletes trip and cascades to related data', async () => {
      // Test implementation
    })

    it('throws error when non-owner tries to delete', async () => {
      // Test implementation
    })
  })
})
```

#### 6.2 Component Tests

**Location:** `apps/web/components/features/trips/__tests__/CreateTripDialog.test.tsx`

```typescript
describe('CreateTripDialog', () => {
  it('renders form fields', () => {
    // Test implementation
  })

  it('validates required fields', () => {
    // Test implementation
  })

  it('validates date range', () => {
    // Test implementation
  })

  it('submits valid form data', () => {
    // Test implementation
  })

  it('shows error on submission failure', () => {
    // Test implementation
  })

  it('closes dialog on successful creation', () => {
    // Test implementation
  })
})
```

**Location:** `apps/web/app/(app)/trips/__tests__/page.test.tsx`

```typescript
describe('TripsPage', () => {
  it('renders trip list', () => {
    // Test implementation
  })

  it('shows empty state when no trips', () => {
    // Test implementation
  })

  it('opens create dialog on button click', () => {
    // Test implementation
  })

  it('navigates to trip detail on card click', () => {
    // Test implementation
  })
})
```

---

### 7. Edge Cases & Error Handling

#### 7.1 Date Validation Edge Cases

- **Same Day Trip:** start_date = end_date (valid, constraint is `>=`)
- **Past Dates:** Prevent creating trips with start_date in the past (client-side only, allow for seed data)
- **Timezone Handling:** All dates stored as UTC (`TIMESTAMPTZ`), display in user's local timezone
- **Leap Year:** Date picker handles Feb 29 correctly
- **Year Boundaries:** Trips spanning across years (Dec 30 - Jan 5)

#### 7.2 Concurrent Updates

- **Optimistic Locking:** Not implemented in MVP (last write wins)
- **Updated_at Timestamp:** Track when trip was last modified
- **Conflict Resolution:** Show error if update fails, ask user to refresh

#### 7.3 Deletion Cascade

- **Foreign Key Constraints:** ON DELETE CASCADE for:
  - `trip_participants`
  - `itinerary_items`
  - `expenses`
  - `expense_participants` (via expenses)
  - `media_files`
- **Confirmation Required:** User must type trip name to confirm deletion
- **No Undo:** Deletion is permanent (future: soft delete with 30-day retention)

#### 7.4 Access Control

- **Owner-Only Edit/Delete:** Enforced by RLS policies
- **Participant Read-Only:** Can view but not modify
- **Viewer Read-Only:** Can view but not modify (same as participant for trips table)
- **Non-Participant:** Cannot see trip at all

---

### 8. User Flows

#### 8.1 Create Trip Flow

1. User clicks "Create New Trip" button
2. Dialog opens with empty form
3. User fills in name, dates, description
4. Client-side validation on each field
5. User clicks "Create Trip"
6. Loading state shown
7. API call creates trip + adds owner as participant
8. Success: Dialog closes, user redirected to trip detail page
9. Error: Show error message, keep dialog open

#### 8.2 Edit Trip Flow

1. User navigates to trip detail page
2. User clicks "Edit Trip" button (owner only)
3. Dialog opens with pre-filled form
4. User modifies fields
5. User clicks "Save Changes"
6. Loading state shown
7. API call updates trip
8. Success: Dialog closes, trip detail page refreshes
9. Error: Show error message, keep dialog open

#### 8.3 Delete Trip Flow

1. User navigates to trip detail page
2. User clicks "Delete Trip" button (owner only)
3. Confirmation dialog opens
4. Warning message shown with list of data to be deleted
5. User types trip name to confirm
6. User clicks "Delete Trip"
7. Loading state shown
8. API call deletes trip (cascade to related data)
9. Success: Redirect to trips list page
10. Error: Show error message, keep dialog open

---

### 9. Testing Strategy

#### 9.1 Unit Tests (Jest/Vitest)

- Query functions (CRUD operations)
- Validation schemas (Zod)
- Helper functions (date formatting, etc.)
- **Target Coverage:** 80%+

#### 9.2 Component Tests (React Testing Library)

- Form components (create/edit dialogs)
- Trip card rendering
- Empty states
- Error states
- Loading states
- **Target Coverage:** 70%+

#### 9.3 Integration Tests

- RLS policy enforcement (already tested in `rls_security_tests.sql`)
- Cascade deletion behavior
- Trip creation with participant auto-add
- **Covered by existing RLS tests**

#### 9.4 E2E Tests (Playwright) - Future

- Complete user flows (create → view → edit → delete)
- Multi-user scenarios
- **Not required for this task**

---

### 10. Implementation Checklist

#### Phase 1: API Layer

- [ ] Create `packages/shared/lib/supabase/queries/trips.ts`
- [ ] Implement `getUserTrips()`
- [ ] Implement `getTripById()`
- [ ] Implement `createTrip()` with auto-participant logic
- [ ] Implement `updateTrip()`
- [ ] Implement `deleteTrip()`
- [ ] Create validation schema in `packages/shared/lib/validation/trip.ts`
- [ ] Write unit tests for all query functions

#### Phase 2: UI Components

- [ ] Create `CreateTripDialog.tsx` component
- [ ] Create `EditTripDialog.tsx` component
- [ ] Create `DeleteTripDialog.tsx` component
- [ ] Create `TripCard.tsx` component
- [ ] Create `TripsList.tsx` component
- [ ] Write component tests

#### Phase 3: Pages

- [ ] Implement `/trips` page (list view)
- [ ] Implement `/trips/[id]` page (detail view)
- [ ] Add empty states
- [ ] Add loading states
- [ ] Add error states
- [ ] Write page tests

#### Phase 4: Integration & Testing

- [ ] Manual testing of all flows
- [ ] Verify RLS policies work correctly
- [ ] Test date validation edge cases
- [ ] Test cascade deletion
- [ ] Verify error handling
- [ ] Test on mobile viewport

#### Phase 5: Documentation

- [ ] Update API documentation
- [ ] Add JSDoc comments to functions
- [ ] Update user guide (future)

---

### 11. Non-Goals (Out of Scope)

❌ **Cover image upload** - Will be added in a future task
❌ **Trip templates** - Post-MVP feature
❌ **Duplicate trip** - Post-MVP feature
❌ **Archive trip** - Post-MVP feature (soft delete)
❌ **Trip visibility settings** (public/private) - Post-MVP
❌ **Trip categories/tags** - Post-MVP
❌ **Trip budget** - Separate epic
❌ **Inviting participants** - Separate task (CRO-698)
❌ **Natural language date input** - Future enhancement
❌ **Recurring trips** - Post-MVP

---

### 12. Dependencies

**Blocking Tasks (Must Complete First):**

- ✅ CRO-689: Trip roles & partial visibility (DONE)
- ✅ Database schema created (DONE)
- ✅ RLS policies implemented (DONE)

**Blocked Tasks (Depend on This):**

- CRO-698: Invite participants
- CRO-691: Itinerary item CRUD
- CRO-692: Expense tracking
- All other trip-related features

---

### 13. Success Metrics

**Functional:**

- ✅ All CRUD operations work
- ✅ RLS policies enforced
- ✅ Date validation working
- ✅ Cascade deletion working
- ✅ All unit tests passing
- ✅ All component tests passing

**User Experience:**

- Trip creation takes < 30 seconds
- Form validation is instant (<100ms)
- Error messages are clear and actionable
- Mobile experience is smooth

**Technical:**

- Query response time < 300ms (p95)
- Zero RLS policy violations in production
- Test coverage >= 75%
- No console errors/warnings

---

### 14. Risks & Mitigation

| Risk                            | Impact   | Probability | Mitigation                                 |
| ------------------------------- | -------- | ----------- | ------------------------------------------ |
| Date timezone issues            | High     | Medium      | Use UTC everywhere, display in user's TZ   |
| Cascade deletion too aggressive | High     | Low         | Confirm dialog, list what will be deleted  |
| RLS policy bugs                 | Critical | Low         | Comprehensive RLS tests already in place   |
| Form validation UX confusion    | Medium   | Medium      | Real-time validation, clear error messages |
| Concurrent update conflicts     | Medium   | Low         | Acceptable for MVP (last write wins)       |

---

### 15. Open Questions

1. **Should past trips be allowed?**
   - **Decision:** Client-side prevent past start_date, but allow in seed data for testing

2. **Should trip name be unique per user?**
   - **Decision:** No, users can have multiple trips with same name

3. **What happens to pending invites when trip is deleted?**
   - **Decision:** Cascade delete via trip_participants FK constraint

4. **Should we show deleted trips in a "Recently Deleted" view?**
   - **Decision:** Not for MVP, permanent deletion is acceptable

5. **Should end_date be required or optional?**
   - **Decision:** Required, but can equal start_date for single-day trips

---

### 16. Future Enhancements (Post-MVP)

- **Cover Image Upload:** Allow users to upload custom trip cover images
- **Trip Templates:** Pre-defined trip structures (beach vacation, ski trip, etc.)
- **Archive/Unarchive:** Soft delete with 30-day retention
- **Trip Duplication:** Clone existing trip structure
- **Trip Sharing:** Generate public link to view trip (read-only)
- **Trip Export:** Export trip details as PDF or iCal
- **Smart Date Suggestions:** "Next weekend", "Summer 2025"
- **Trip Budget:** Set overall budget with expense tracking

---

## Estimated Implementation Time

- **API Layer:** 4 hours
- **UI Components:** 6 hours
- **Pages:** 4 hours
- **Unit Tests:** 4 hours
- **Integration Testing:** 2 hours
- **Bug Fixes & Polish:** 2 hours

**Total:** ~22 hours (matches 5 story points)

---

## Definition of Done

✅ All acceptance criteria met
✅ Unit tests written and passing (>= 75% coverage)
✅ Component tests written and passing
✅ RLS policies verified with existing tests
✅ Manual testing completed on web and mobile
✅ Code reviewed and merged
✅ Documentation updated
✅ No console errors or warnings

---

## References

- [CLAUDE.md](/CLAUDE.md) - Project documentation
- [RLS_DATE_SCOPING.md](/docs/RLS_DATE_SCOPING.md) - RLS architecture
- [RLS_TESTING.md](/docs/RLS_TESTING.md) - Security testing guide
- [Linear Task CRO-690](https://linear.app/crod/issue/CRO-690)
- [Database Schema Migration 001](/supabase/migrations/20250129000001_create_users_trips_participants.sql)

---

**Document Version:** 1.0
**Last Updated:** 2025-01-29
**Author:** Claude Code
