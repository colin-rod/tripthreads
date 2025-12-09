# RLS Trip INSERT Issue - Cannot Create Trips Despite Correct Policies

## Problem Summary

**Issue:** Trip INSERT operations fail with RLS policy violation despite having correct policies in place.

**Error:** `new row violates row-level security policy for table "trips"` (Error code: 42501)

**Status:** Blocking all integration tests (98 tests failing)

---

## Current State

### ✅ What's Working

1. **Test users created successfully:**
   - alice@test.tripthreads.com (ID: cd1ac94d-54b7-4a4c-96ab-7c3eaf6da184)
   - benji@test.tripthreads.com (ID: a3bdc626-16c7-47be-ab3d-31e27aa7164e)
   - baylee@test.tripthreads.com (ID: 6649c004-ca5f-4773-9f91-dcb4be64698a)
   - maya@test.tripthreads.com (ID: fc666afc-c24a-4805-b14f-d04115b53773)

2. **Authentication working:**
   - `supabase.auth.signInWithPassword()` succeeds
   - Returns valid session tokens
   - User ID matches expected value

3. **RLS policies exist and appear correct:**

   **trips table INSERT policy:**

   ```sql
   Policy: "Users can create trips"
   Command: INSERT
   WITH CHECK: (auth.uid() = owner_id)
   ```

   **trip_participants table INSERT policy:**

   ```sql
   Policy: "Trip owners can add participants"
   Command: INSERT
   WITH CHECK: (is_trip_owner(trip_id, auth.uid()) OR current_setting('app.trigger_context', true) = 'create_trip_owner_participant')
   ```

4. **Trigger function has SECURITY DEFINER:**
   ```sql
   CREATE OR REPLACE FUNCTION public.create_trip_owner_participant()
   RETURNS trigger
   LANGUAGE plpgsql
   SECURITY DEFINER  -- ✅ Should bypass RLS
   SET search_path TO 'public'
   ```

### ❌ What's NOT Working

**Trip INSERT fails in both:**

1. Manual test script (`scripts/test-trip-insert.ts`)
2. Integration tests (`invite-system.test.ts`, `itinerary-crud.test.ts`)

**Test script output:**

```
✅ Authenticated as: cd1ac94d-54b7-4a4c-96ab-7c3eaf6da184
📧 Email: alice@test.tripthreads.com
🎫 Session token: eyJhbGciOiJIUzI1NiIs...

🔨 Attempting to insert trip...
Owner ID: cd1ac94d-54b7-4a4c-96ab-7c3eaf6da184

❌ Insert failed: new row violates row-level security policy for table "trips"
Error code: 42501
```

---

## Investigation Done

### 1. Verified Policy Exists

```sql
SELECT tablename, policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'trips' AND cmd = 'INSERT';

-- Result: Policy exists with WITH CHECK (auth.uid() = owner_id)
```

### 2. Verified Both Policies Created

- ✅ trips INSERT policy: Created via migration `20251209000001_add_trips_insert_policy.sql`
- ✅ trip_participants INSERT policy: Created via migration `20251209000002_add_trip_participants_insert_policy.sql`

### 3. Confirmed Service Role CAN INSERT

Previously tested with `scripts/check-rls-status.ts` - service role bypasses RLS successfully.

### 4. Confirmed auth.uid() Works for SELECT

Tested with `scripts/test-auth-uid.ts` - SELECT queries on profiles and trips work correctly.

---

## Root Cause Hypothesis

**The `auth.uid()` function is returning NULL during INSERT operations when called via Supabase client.**

### Why This Might Be Happening:

1. **JWT not properly propagated to database context**
   - Client-side session exists (proven by successful signIn)
   - But Postgres auth.uid() may not be seeing the JWT during INSERT

2. **Possible Supabase client issue in Node.js environment**
   - Tests run in Node.js (Jest with `@jest-environment node`)
   - Browser client vs Node client may handle sessions differently

3. **Session not attached to database queries**
   - `signInWithPassword()` sets session on client object
   - But subsequent `.from('trips').insert()` may not be using that session

---

## Test Code

**Script that's failing:**

```typescript
// scripts/test-trip-insert.ts
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: TEST_USERS.alice.email,
  password: TEST_USERS.alice.password,
})
// ✅ authData.user.id = cd1ac94d-54b7-4a4c-96ab-7c3eaf6da184

const trip = {
  name: `Test Trip ${Date.now()}`,
  description: 'Testing RLS policy',
  start_date: '2025-12-01',
  end_date: '2025-12-10',
  owner_id: TEST_USERS.alice.id, // cd1ac94d-54b7-4a4c-96ab-7c3eaf6da184
}

const { data, error } = await supabase.from('trips').insert(trip).select().single()
// ❌ Error: new row violates row-level security policy for table "trips"
```

---

## What We Need to Debug

### Option 1: Check what auth.uid() actually returns during INSERT

Run this SQL in Supabase SQL Editor while authenticated as a test user:

```sql
-- This would require being authenticated via SQL Editor, which may not be possible
SELECT auth.uid();
```

### Option 2: Create a debug RPC function

```sql
CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS TABLE (
  auth_uid uuid,
  auth_role text,
  jwt_claims jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT
    auth.uid(),
    auth.role(),
    auth.jwt();
END;
$$;
```

Then call from test script:

```typescript
const { data } = await supabase.rpc('debug_auth_context')
console.log('Auth context:', data)
```

### Option 3: Temporarily allow all INSERTs to test

```sql
-- TEMPORARY DEBUG POLICY - DO NOT USE IN PRODUCTION
DROP POLICY IF EXISTS "Users can create trips" ON public.trips;

CREATE POLICY "Users can create trips"
  ON public.trips
  FOR INSERT
  TO public
  WITH CHECK (true);  -- Allow all inserts temporarily
```

If this works, we know the issue is specifically with `auth.uid()` not matching `owner_id`.

---

## Questions for Investigation

1. **Does `auth.uid()` return NULL during INSERT?**
   - If yes, why is the JWT not being passed to Postgres?

2. **Does the Supabase client properly set the Authorization header?**
   - Can we verify the header is being sent with the INSERT request?

3. **Is there a difference between browser and Node.js Supabase clients?**
   - Do we need to use a different approach for server-side auth?

4. **Could this be a Supabase project configuration issue?**
   - Are there any project-level JWT settings that need adjustment?

---

## Relevant Files

- Migration: `/supabase/migrations/20251209000001_add_trips_insert_policy.sql`
- Migration: `/supabase/migrations/20251209000002_add_trip_participants_insert_policy.sql`
- Test script: `/scripts/test-trip-insert.ts`
- Test helpers: `/apps/web/tests/integration/invite-test-helpers.ts`
- Integration tests: `/apps/web/tests/integration/invite-system.test.ts`
- Integration tests: `/apps/web/tests/integration/itinerary-crud.test.ts`

---

## Next Steps

1. Create debug RPC function to check `auth.uid()` value during INSERT
2. Verify JWT is properly sent in Authorization header
3. Consider if we need to use service role for test setup instead
4. Check Supabase documentation for Node.js-specific authentication patterns
5. Review if there's a Supabase client configuration we're missing

---

## Environment

- **Database:** Supabase (Remote: tbwbaydyyjokrsjtgerh.supabase.co)
- **Test Framework:** Jest with Node.js environment
- **Supabase Client:** @supabase/supabase-js
- **Node Version:** 20+
- **RLS:** Enabled on trips table (verified)

---

## Additional Context

This issue appeared after:

1. Creating test users in remote Supabase (previously didn't exist)
2. Adding INSERT policies to trips and trip_participants tables
3. Verifying policies exist with correct definitions

The mystery is: **Why does `auth.uid()` work for SELECT but not for INSERT?**
