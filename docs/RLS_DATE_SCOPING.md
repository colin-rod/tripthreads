## Date-Scoped Row-Level Security (RLS)

## Overview

TripThreads implements **date-scoped Row-Level Security (RLS)** to ensure partial joiners (users who join a trip mid-way) only see data from their join date forward. This provides privacy and prevents users from accessing historical data they weren't part of.

## Key Concepts

### User Roles

1. **Owner** - Creator of the trip
   - Sees ALL data regardless of date
   - Can manage all aspects of the trip
   - Can add/remove participants
   - Can delete any content

2. **Participant** - Active trip member
   - Sees data from their `joined_at` date forward
   - Can create itinerary items, expenses, media
   - Can edit/delete their own content
   - **Date-scoped access** applies to:
     - Itinerary items (based on `start_time`)
     - Expenses (based on `date`)

3. **Viewer** - Read-only access
   - Sees ALL itinerary items and media (no date scoping)
   - Does NOT see expenses (privacy)
   - Cannot create, edit, or delete anything

### Date Scoping Rules

| Role        | Itinerary Items  | Expenses         | Media Files |
| ----------- | ---------------- | ---------------- | ----------- |
| Owner       | All (no scoping) | All (no scoping) | All         |
| Participant | From `joined_at` | From `joined_at` | All         |
| Viewer      | All (no scoping) | None (hidden)    | All         |

**Key Points:**

- **Media files have NO date scoping** - all participants see all photos/videos
- **Expenses are hidden from viewers** - only participants and owners see financial data
- **Partial joiners** see future items but not historical ones

## Database Schema

### trip_participants Table

```sql
CREATE TABLE public.trip_participants (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('owner', 'participant', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Critical for date scoping
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**The `joined_at` timestamp is the anchor for all date-scoped visibility.**

### Helper Functions

#### 1. `get_user_trip_join_date(p_trip_id UUID, p_user_id UUID)`

Returns the join date for a user in a trip.

```sql
CREATE FUNCTION public.get_user_trip_join_date(p_trip_id UUID, p_user_id UUID)
RETURNS TIMESTAMPTZ
AS $$
  SELECT joined_at
  FROM public.trip_participants
  WHERE trip_id = p_trip_id AND user_id = p_user_id
  LIMIT 1;
$$;
```

**Usage:**

```sql
SELECT public.get_user_trip_join_date(
  '10000000-0000-0000-0000-000000000001'::UUID,
  'user-id-here'::UUID
);
-- Returns: '2025-06-18 00:00:00+00'::TIMESTAMPTZ
```

#### 2. `can_user_see_item(p_item_date TIMESTAMPTZ, p_trip_id UUID, p_user_id UUID)`

Checks if a user can see an item based on their role and join date.

```sql
CREATE FUNCTION public.can_user_see_item(
  p_item_date TIMESTAMPTZ,
  p_trip_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
AS $$
  SELECT
    CASE
      -- Owners see everything
      WHEN EXISTS (
        SELECT 1 FROM public.trips
        WHERE id = p_trip_id AND owner_id = p_user_id
      ) THEN true

      -- Viewers see everything (read-only)
      WHEN EXISTS (
        SELECT 1 FROM public.trip_participants
        WHERE trip_id = p_trip_id AND user_id = p_user_id AND role = 'viewer'
      ) THEN true

      -- Participants see items from their join date forward
      WHEN EXISTS (
        SELECT 1 FROM public.trip_participants
        WHERE trip_id = p_trip_id
          AND user_id = p_user_id
          AND role = 'participant'
          AND p_item_date >= joined_at
      ) THEN true

      ELSE false
    END;
$$;
```

**Usage:**

```sql
SELECT public.can_user_see_item(
  '2025-06-20 18:00:00+00'::TIMESTAMPTZ, -- Item date
  '10000000-0000-0000-0000-000000000001'::UUID, -- Trip ID
  'user-id-here'::UUID -- User ID
);
-- Returns: true or false
```

## RLS Policies

### Itinerary Items

**Read Policy:**

```sql
CREATE POLICY "Users can read itinerary items based on join date"
  ON public.itinerary_items
  FOR SELECT
  USING (
    public.can_user_see_item(start_time, trip_id, auth.uid())
  );
```

**What this means:**

- Alice (owner) on Paris trip starting 2025-06-15:
  - ✅ Sees flight on 2025-06-15 (before start)
  - ✅ Sees activities on 2025-06-16
  - ✅ Sees everything (owner privilege)

- Benji (participant) who joined 2025-06-18:
  - ❌ Does NOT see flight on 2025-06-15
  - ❌ Does NOT see activities on 2025-06-16
  - ✅ Sees Louvre visit on 2025-06-18 (join date)
  - ✅ Sees hotel check-in on 2025-06-19
  - ✅ Sees cruise on 2025-06-20

- Baylee (viewer):
  - ✅ Sees everything (viewers have no date scoping)

**Create Policy:**

```sql
CREATE POLICY "Participants can create itinerary items"
  ON public.itinerary_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = itinerary_items.trip_id
        AND trip_participants.user_id = auth.uid()
        AND trip_participants.role IN ('owner', 'participant')
    )
    AND auth.uid() = created_by
  );
```

**What this means:**

- Only owners and participants can create items
- Viewers cannot create (read-only)
- User must set themselves as `created_by`

### Expenses

**Read Policy:**

```sql
CREATE POLICY "Users can read expenses based on join date"
  ON public.expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = expenses.trip_id
        AND trip_participants.user_id = auth.uid()
        AND trip_participants.role IN ('owner', 'participant')
        AND expenses.date >= trip_participants.joined_at
    )
  );
```

**What this means:**

- Alice (owner) on Paris trip:
  - ✅ Sees €35 airport taxi on 2025-06-15
  - ✅ Sees €85 dinner on 2025-06-16
  - ✅ Sees all expenses (owner privilege)

- Benji (participant) who joined 2025-06-18:
  - ❌ Does NOT see €35 airport taxi on 2025-06-15
  - ❌ Does NOT see €85 dinner on 2025-06-16
  - ✅ Sees €42 Louvre tickets on 2025-06-18
  - ✅ Sees €65 lunch on 2025-06-19
  - ✅ Sees €50 cruise on 2025-06-20

- Baylee (viewer):
  - ❌ Does NOT see ANY expenses (privacy)

**Why viewers don't see expenses:**

- Financial data is sensitive
- Viewers are often friends/family who aren't splitting costs
- Read-only access shouldn't include financial details

### Media Files

**Read Policy:**

```sql
CREATE POLICY "Trip participants can read all media"
  ON public.media_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = media_files.trip_id
        AND trip_participants.user_id = auth.uid()
    )
  );
```

**What this means:**

- **NO date scoping for media files**
- All participants (including partial joiners) see all photos/videos
- Viewers also see all media
- Rationale: Photos are meant to be shared with everyone on the trip

## Testing RLS Policies

### Using Supabase SQL Editor

1. **Test as Alice (owner):**

```sql
-- Set auth context to Alice
SET LOCAL auth.uid TO 'ea1854fb-b8f4-480f-899f-af1bcf0218b3';

-- Query itinerary items
SELECT COUNT(*) FROM public.itinerary_items
WHERE trip_id = '10000000-0000-0000-0000-000000000001';
-- Expected: 5 (all items)

-- Query expenses
SELECT COUNT(*) FROM public.expenses
WHERE trip_id = '10000000-0000-0000-0000-000000000001';
-- Expected: 5 (all expenses)
```

2. **Test as Benji (partial joiner):**

```sql
-- Set auth context to Benji
SET LOCAL auth.uid TO '0af9094b-dedb-4472-8133-20577fbc8f98';

-- Query itinerary items
SELECT COUNT(*) FROM public.itinerary_items
WHERE trip_id = '10000000-0000-0000-0000-000000000001';
-- Expected: 3 (items from 2025-06-18 onward)

-- Query expenses
SELECT COUNT(*) FROM public.expenses
WHERE trip_id = '10000000-0000-0000-0000-000000000001';
-- Expected: 3 (expenses from 2025-06-18 onward)
```

3. **Test as Baylee (viewer):**

```sql
-- Set auth context to Baylee
SET LOCAL auth.uid TO '29f0dac4-7629-45f8-8fa1-10e0df75ce1b';

-- Query itinerary items
SELECT COUNT(*) FROM public.itinerary_items
WHERE trip_id = '10000000-0000-0000-0000-000000000001';
-- Expected: 5 (viewers see all items)

-- Query expenses
SELECT COUNT(*) FROM public.expenses
WHERE trip_id = '10000000-0000-0000-0000-000000000001';
-- Expected: 0 (viewers don't see expenses)

-- Query media files
SELECT COUNT(*) FROM public.media_files
WHERE trip_id = '10000000-0000-0000-0000-000000000001';
-- Expected: 4 (all media)
```

### Using Test Queries File

Run the comprehensive test suite:

```bash
psql -U postgres -h localhost -d postgres -f supabase/tests/rls_date_scoped_tests.sql
```

This will insert test data and validate all RLS policies with assertions.

## Common Scenarios

### Scenario 1: User Joins Trip Mid-Way

**Setup:**

- Paris trip: June 15-22, 2025
- Alice creates trip, is owner
- Benji is invited on June 18

**What happens:**

1. Benji accepts invite on June 18
2. `trip_participants.joined_at` is set to `2025-06-18 00:00:00+00`
3. Benji queries `/api/trips/:id/itinerary`:
   - Backend uses RLS automatically
   - RLS filters items WHERE `start_time >= '2025-06-18'`
   - Benji only sees items from June 18 onward
4. Benji queries `/api/trips/:id/expenses`:
   - RLS filters expenses WHERE `date >= '2025-06-18'`
   - Benji only sees expenses from June 18 onward

### Scenario 2: Viewer Invited to Past Trip

**Setup:**

- Tokyo trip: March 1-10, 2025 (in the past)
- Alice and Bob were participants
- Baylee is invited as viewer on July 1, 2025

**What happens:**

1. Baylee accepts invite as viewer
2. Baylee queries `/api/trips/:id/itinerary`:
   - RLS allows viewers to see all items (no date scoping)
   - Baylee sees all activities from March
3. Baylee queries `/api/trips/:id/expenses`:
   - RLS denies viewers from seeing expenses
   - Baylee sees nothing (empty array)
4. Baylee queries `/api/trips/:id/feed`:
   - RLS allows viewers to see all media
   - Baylee sees all photos from March

### Scenario 3: Participant Promoted to Owner

**Setup:**

- Barcelona trip
- Bob is participant who joined late
- Alice (owner) makes Bob a co-owner

**What happens:**

1. Alice updates `trip_participants.role = 'owner'` for Bob
2. Bob refreshes the app
3. Bob now sees ALL historical data:
   - Itinerary items before his join date
   - Expenses before his join date
   - `can_user_see_item()` returns `true` for all dates (owner privilege)

## Edge Cases

### 1. User Joins Before Trip Starts

```sql
-- User joins trip on June 1
-- Trip starts June 15
-- joined_at = '2025-06-01'

-- User sees all itinerary items including those before trip start
-- because start_time >= joined_at
```

**Result:** ✅ User sees everything (correct behavior)

### 2. Retroactive Itinerary Items

```sql
-- Trip is June 15-22
-- User joins June 18
-- Alice adds a "pre-trip planning meeting" item on June 10

-- Item has start_time = '2025-06-10'
-- User's joined_at = '2025-06-18'
```

**Result:** ❌ User does NOT see planning meeting (correct - they weren't part of it)

### 3. Future Expenses

```sql
-- User joins trip June 18
-- Alice creates expense for "return flight" on June 22

-- Expense date = '2025-06-22'
-- User's joined_at = '2025-06-18'
```

**Result:** ✅ User sees future expense (correct - they'll be part of it)

### 4. Timezone Considerations

```sql
-- All dates stored as TIMESTAMPTZ (timezone-aware)
-- joined_at = '2025-06-18 00:00:00+00' (UTC midnight)
-- Item start_time = '2025-06-17 23:30:00+00' (UTC)

-- Comparison: '2025-06-17 23:30:00+00' < '2025-06-18 00:00:00+00'
```

**Result:** ❌ User does NOT see this item (30 minutes before midnight UTC)

**Best Practice:** Use start-of-day timestamps for `joined_at` in UTC to avoid edge cases.

## Performance Considerations

### Indexing

Indexes are created on all date columns used in RLS policies:

```sql
CREATE INDEX idx_itinerary_items_start_time ON public.itinerary_items(start_time);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_media_files_date_taken ON public.media_files(date_taken);
```

### Query Performance

RLS policies use efficient subqueries that leverage indexes:

```sql
-- Good: Uses index on trip_id and joined_at
WHERE EXISTS (
  SELECT 1 FROM public.trip_participants
  WHERE trip_id = item.trip_id
    AND user_id = auth.uid()
    AND item.date >= joined_at
)

-- Avoid: Full table scans
WHERE item.date >= (
  SELECT joined_at FROM trip_participants
  WHERE user_id = auth.uid()
  LIMIT 1
)
```

### Function Caching

Helper functions are marked `STABLE` for better performance:

```sql
CREATE FUNCTION public.can_user_see_item(...)
RETURNS BOOLEAN
LANGUAGE sql
STABLE  -- Result won't change within a single query
SECURITY DEFINER  -- Runs with definer's privileges
```

## Security Considerations

### 1. RLS Cannot Be Bypassed

All queries go through RLS, even:

- Supabase client queries
- Direct SQL queries
- API routes
- Edge Functions

**Only exception:** Service role key (should never be exposed to client)

### 2. Function Security

Helper functions are `SECURITY DEFINER`:

- Runs with function creator's privileges
- User cannot bypass RLS by calling function directly
- Function itself enforces proper checks

### 3. Client-Side Filtering is NOT Enough

**❌ Bad:**

```typescript
// Client-side filtering (can be bypassed)
const items = await supabase.from('itinerary_items').select('*').gte('start_time', userJoinDate)
```

**✅ Good:**

```typescript
// RLS enforces filtering server-side
const items = await supabase.from('itinerary_items').select('*')
// RLS automatically filters based on joined_at
```

### 4. Role Changes

When a user's role changes:

- RLS takes effect immediately
- No need to refresh tokens
- Next query uses new role

### 5. Audit Trail

All RLS-protected tables include `created_by` for accountability:

```sql
CREATE TABLE itinerary_items (
  ...
  created_by UUID REFERENCES users(id),
  ...
);
```

## Troubleshooting

### Issue: User Can See Historical Data

**Diagnosis:**

```sql
-- Check user's join date
SELECT joined_at FROM trip_participants
WHERE trip_id = 'trip-id' AND user_id = 'user-id';

-- Check item dates
SELECT start_time FROM itinerary_items
WHERE trip_id = 'trip-id';
```

**Possible Causes:**

1. User is owner or viewer (sees everything by design)
2. `joined_at` was set incorrectly (too early)
3. RLS policy not applied (check `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)

### Issue: User Cannot See Any Data

**Diagnosis:**

```sql
-- Verify user is participant
SELECT * FROM trip_participants
WHERE trip_id = 'trip-id' AND user_id = 'user-id';

-- Test helper function
SELECT public.can_user_see_item(
  NOW()::TIMESTAMPTZ,
  'trip-id'::UUID,
  'user-id'::UUID
);
```

**Possible Causes:**

1. User not in `trip_participants` table
2. `joined_at` is in the future
3. Items have dates before `joined_at`

### Issue: Performance Degradation

**Diagnosis:**

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM itinerary_items
WHERE trip_id = 'trip-id';

-- Verify indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'itinerary_items';
```

**Solutions:**

1. Ensure indexes exist on `trip_id`, `start_time`, `date`
2. Use `ANALYZE` to update statistics
3. Consider materialized views for complex queries

## Migration Path

### Adding Date-Scoped RLS to Existing Tables

If you have existing data:

```sql
-- 1. Add joined_at column if missing
ALTER TABLE trip_participants
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;

-- 2. Backfill joined_at for existing participants
UPDATE trip_participants
SET joined_at = COALESCE(
  (SELECT MIN(created_at) FROM trips WHERE id = trip_participants.trip_id),
  trip_participants.created_at
)
WHERE joined_at IS NULL;

-- 3. Make joined_at NOT NULL
ALTER TABLE trip_participants
ALTER COLUMN joined_at SET NOT NULL;

-- 4. Apply RLS policies
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY ... -- As shown above
```

---

**Last Updated:** January 2025
**Status:** Complete (Phase 1 E2)
**Related Documentation:**

- [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md) - Database backup procedures
- [AUTH_SETUP.md](./AUTH_SETUP.md) - Authentication configuration
- [supabase/README.md](../supabase/README.md) - Database setup guide
