# RLS Policy Security Testing Guide

**Related:** CRO-797 (Linear)
**Last Updated:** 2025-01-29

## Overview

This guide documents the security testing strategy for Row-Level Security (RLS) policies in TripThreads. RLS is the primary authorization mechanism that enforces access control at the database level.

## Why Security Testing is Critical

RLS policies are the **last line of defense** for data security:

- Application-level auth can be bypassed
- API vulnerabilities can expose data
- RLS runs in PostgreSQL, enforced before any data leaves the database

**If RLS fails, user data is exposed.** These tests ensure that doesn't happen.

## Test Structure

### Test Suites

We maintain two complementary test suites:

1. **SQL-Based Tests** (`supabase/tests/rls_security_tests.sql`)
   - Direct PostgreSQL queries
   - Tests helper functions (`is_trip_owner`, `can_user_see_item`, etc.)
   - Policy definition validation
   - Fast execution (no HTTP overhead)

2. **TypeScript Integration Tests** (`apps/web/tests/integration/rls-security.test.ts`)
   - Uses Supabase client with real auth contexts
   - Simulates actual user scenarios
   - Tests end-to-end data flow
   - Validates JWT token handling

### Test Categories

| Category                    | Description                 | Test IDs    |
| --------------------------- | --------------------------- | ----------- |
| **Trip Access Control**     | Who can read/modify trips   | TC1.1-TC1.5 |
| **Participant Permissions** | Participant list visibility | TC2.1-TC2.4 |
| **Date-Scoped Visibility**  | Partial joiner access rules | TC3.1-TC3.4 |
| **Expense Privacy**         | Financial data isolation    | TC4.1-TC4.5 |
| **Attack Scenarios**        | Security threat mitigation  | TC5.1-TC5.5 |
| **Cross-Trip Isolation**    | Data segregation by trip    | TC6.1-TC6.4 |
| **Edge Cases**              | Unusual scenarios           | TC7.1-TC7.3 |

## Test Scenarios

### TC1: Trip Access Control

#### TC1.1: Unauthorized Trip Access

**Scenario:** Maya (not on Paris trip) attempts to read trip details

**Expected:** Query returns empty, no data leaked

**SQL Test:**

```sql
SELECT * FROM public.trips
WHERE id = '10000000-0000-0000-0000-000000000001'
-- Running as Maya (55555555-5555-5555-5555-555555555555)
-- Should return 0 rows
```

**TypeScript Test:**

```typescript
const mayaClient = await getAuthenticatedClient('maya')
const { data } = await mayaClient.from('trips').select('*').eq('id', PARIS_TRIP_ID)

expect(data).toEqual([])
```

#### TC1.2: Participant Cannot Modify Trip

**Scenario:** Benji (participant) tries to update trip name

**Expected:** Update rejected with permission error

**Rationale:** Only trip owner can modify trip details

### TC2: Participant Permissions

#### TC2.1: Non-Participant Cannot See Participants

**Scenario:** Maya queries `trip_participants` for Paris trip

**Expected:** Empty result, no participant data visible

**Security Implication:** Prevents user enumeration attacks

#### TC2.4: Self-Invitation Blocked

**Scenario:** Maya inserts herself into Paris trip participants

**Expected:** INSERT fails with RLS violation

**Rationale:** Only trip owner can add participants (prevents unauthorized access)

### TC3: Date-Scoped Visibility

#### TC3.1: Historical Data Hidden from Partial Joiners

**Scenario:** Benji (joined 2025-06-18) queries itinerary items from 2025-06-15

**Expected:** Items before join date not visible

**Implementation:**

```sql
-- RLS policy uses can_user_see_item() which checks:
IF v_user_role = 'participant' THEN
  RETURN p_item_date >= v_joined_at;
END IF;
```

#### TC3.3: Owners See Everything

**Scenario:** Alice queries items from before trip start date

**Expected:** All items visible, no date filtering

**Rationale:** Trip owners created the trip and need full visibility

### TC4: Expense Privacy

#### TC4.5: Viewers Cannot See Expenses

**Scenario:** Baylee (viewer role) queries expenses

**Expected:** Empty result

**Rationale:** Financial data is sensitive, viewers only see itinerary/media

**Critical Policy:**

```sql
CREATE POLICY "Users can read expenses based on join date"
  ON public.expenses FOR SELECT
  USING (
    public.can_user_see_expense(date, trip_id, auth.uid())
  );

-- can_user_see_expense() explicitly checks role IN ('owner', 'participant')
-- Excludes 'viewer' role
```

### TC5: Attack Scenarios

#### TC5.1: Trip ID Enumeration

**Scenario:** Alice tries sequential UUIDs to discover Maya's trips

**Expected:** No data leaked, RLS blocks unauthorized trips

**Attack Vector:**

```typescript
// Attacker tries to enumerate trips
for (let i = 0; i < 1000; i++) {
  const guessedId = generateSequentialUUID(i)
  const { data } = await client.from('trips').select('*').eq('id', guessedId)
  // Should always return empty for trips user is not part of
}
```

#### TC5.2: SQL Injection Prevention

**Scenario:** Malicious input in trip name field

**Expected:** PostgreSQL parameterized queries prevent injection

**Example Attack:**

```typescript
const maliciousName = "Trip'; DROP TABLE trips;--"
await client.from('trips').insert({ name: maliciousName })
// Query is parameterized: INSERT INTO trips (name) VALUES ($1)
// Value is safely escaped
```

#### TC5.4: Deleted User Access Revocation

**Scenario:** User account deleted, JWT still valid temporarily

**Expected:** RLS checks fail, no data accessible

**Implementation:** All RLS policies check `auth.uid()` which returns NULL for deleted users

### TC6: Cross-Trip Data Isolation

#### TC6.1: User Cannot See Other User's Trips

**Scenario:** Alice queries trips table, sees only trips she's a participant in

**Expected:** Maya's Tokyo trip not visible

**Critical Policy:**

```sql
CREATE POLICY "Users can read trips they participate in"
  ON public.trips FOR SELECT
  USING (
    public.is_trip_participant(id, auth.uid())
  );
```

### TC7: Edge Cases

#### TC7.1: Removed Participant Loses Access Immediately

**Scenario:**

1. Benji is on Paris trip
2. Alice removes Benji from `trip_participants`
3. Benji refreshes page

**Expected:** Benji can no longer see Paris trip (no caching issues)

**Implementation:** RLS policies query `trip_participants` directly, changes take effect immediately

## Test Users

All tests use these seed users:

| User   | ID             | Email           | Roles                                         |
| ------ | -------------- | --------------- | --------------------------------------------- |
| Alice  | `22222222-...` | temp@test.com   | Owner of Paris trip                           |
| Benji  | `44444444-...` | benji@temp.com  | Participant on Paris trip (joined 2025-06-18) |
| Baylee | `66666666-...` | baylee@temp.com | Viewer on Paris trip                          |
| Maya   | `55555555-...` | maya@test.com   | Owner of Tokyo trip, not on Paris trip        |

## Running Tests

### SQL Tests

```bash
# Connect to Supabase database
psql -h db.xxx.supabase.co -U postgres -d postgres

# Run security tests
\i supabase/tests/rls_security_tests.sql

# Expected output:
# - All tests labeled ✅ PASS
# - Summary shows 14/14 tests passing (100% pass rate)
```

### TypeScript Integration Tests

```bash
# From apps/web directory
npm test -- rls-security.test.ts

# Or run all integration tests
npm run test:integration
```

### CI/CD Integration

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Run RLS Security Tests
  run: |
    # Start Supabase locally
    supabase start

    # Run SQL tests
    supabase db test

    # Run TypeScript tests
    npm run test:integration
```

## Test Coverage Requirements

- **100% coverage** for all RLS policies
- Every policy must have ≥2 tests:
  1. Positive test (authorized access succeeds)
  2. Negative test (unauthorized access blocked)
- Edge cases must be documented and tested
- Attack scenarios must simulate real threats

## Writing New RLS Tests

### When to Add Tests

Add new RLS tests when:

1. Creating a new table with RLS
2. Adding a new RLS policy
3. Modifying existing policies
4. Discovering a security vulnerability
5. Adding a new user role

### Test Template (SQL)

```sql
-- Test: [Description of what is being tested]
SELECT '[TC#]: [Test name]' AS test_case,
       CASE
         WHEN [expected_condition] THEN '✅ PASS'
         ELSE '❌ FAIL'
       END AS status,
       '[Explanation of test]' AS note;
```

### Test Template (TypeScript)

```typescript
it('[TC#]: [Test description]', async () => {
  const client = await getAuthenticatedClient('[user]')

  const { data, error } = await client.from('[table]').select('*').eq('[condition]', '[value]')

  expect([assertion]).toBe([expected])
})
```

## Common Pitfalls

### 1. Infinite Recursion

**Problem:** RLS policy queries a table that has its own RLS policy

**Example:**

```sql
-- BAD: This causes recursion
CREATE POLICY "Users can read trips"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants  -- Triggers trip_participants RLS
      WHERE trip_id = trips.id
    )
  );
```

**Solution:** Use SECURITY DEFINER functions

```sql
-- GOOD: Function bypasses RLS
CREATE FUNCTION is_trip_participant(...)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with creator privileges
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_participants  -- No RLS triggered
    WHERE ...
  );
END;
$$;

CREATE POLICY "Users can read trips"
  ON trips FOR SELECT
  USING (
    is_trip_participant(id, auth.uid())
  );
```

### 2. Missing Auth Context in Tests

**Problem:** Test queries run as postgres user, not as actual user

**Wrong:**

```sql
-- This doesn't test RLS!
SELECT * FROM trips WHERE id = '...';
-- Running as superuser bypasses RLS
```

**Right:**

```typescript
// Use Supabase client with real JWT
const client = await getAuthenticatedClient('maya')
const { data } = await client.from('trips').select('*')
```

### 3. Forgetting to Test Negative Cases

**Problem:** Only testing authorized access, not unauthorized

**Wrong:**

```typescript
it('Owner can read trip', async () => {
  const client = await getAuthenticatedClient('alice')
  const { data } = await client.from('trips').select('*')
  expect(data).toBeTruthy()
})
// Missing: Test that non-owner CANNOT read trip
```

**Right:**

```typescript
it('Owner can read trip', async () => {
  /* ... */
})

it('Non-participant cannot read trip', async () => {
  const client = await getAuthenticatedClient('maya')
  const { data } = await client.from('trips').select('*').eq('id', PARIS_TRIP_ID)
  expect(data).toEqual([]) // Verify blocked
})
```

## Security Best Practices

1. **Always test unauthorized access** - Most security bugs are missed negative cases
2. **Use realistic attack scenarios** - Think like an attacker
3. **Test all CRUD operations** - SELECT, INSERT, UPDATE, DELETE
4. **Verify error messages don't leak data** - "Permission denied" is safe, "User X owns this" is not
5. **Test edge cases** - Expired trips, deleted users, removed participants
6. **Automate in CI** - Security tests must run on every PR
7. **Document assumptions** - Why is this access allowed/denied?

## Debugging Failed Tests

### Test Fails: User Can See Data They Shouldn't

1. **Check RLS is enabled:**

   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename = '[table]';
   -- rowsecurity should be true
   ```

2. **List all policies:**

   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = '[table]';
   ```

3. **Test helper functions directly:**

   ```sql
   SELECT can_user_see_item('[date]', '[trip_id]', '[user_id]');
   -- Should return false for unauthorized users
   ```

4. **Check for infinite recursion:**
   ```sql
   -- Look for error in logs
   ERROR: infinite recursion detected in policy for relation "[table]"
   ```

### Test Fails: Authorized User Blocked

1. **Verify user is in trip_participants:**

   ```sql
   SELECT * FROM trip_participants
   WHERE trip_id = '[trip_id]' AND user_id = '[user_id]';
   ```

2. **Check joined_at date:**

   ```sql
   -- For date-scoped access
   SELECT joined_at FROM trip_participants
   WHERE trip_id = '[trip_id]' AND user_id = '[user_id]';
   -- Should be <= item date
   ```

3. **Verify auth.uid() is set:**
   ```sql
   SELECT auth.uid();
   -- Should return user UUID, not NULL
   ```

## Monitoring and Alerts

### Production Monitoring

Set up alerts for:

- Spike in "permission denied" errors (possible attack)
- Users accessing unusual number of trips (enumeration attempt)
- Failed auth attempts with valid-looking trip IDs
- Queries from expired JWTs

### Sentry Integration

```typescript
// Log RLS violations to Sentry
client
  .from('trips')
  .select('*')
  .then(({ data, error }) => {
    if (error?.message.includes('permission denied')) {
      Sentry.captureException(error, {
        level: 'warning',
        tags: { type: 'rls_violation' },
      })
    }
  })
```

## Resources

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- [TripThreads RLS Architecture](./RLS_DATE_SCOPING.md)

## Conclusion

RLS testing is not optional. Every policy must be tested with:

1. Positive case (authorized access)
2. Negative case (unauthorized access blocked)
3. Edge cases (partial access, expired sessions)
4. Attack scenarios (enumeration, injection)

**Remember:** A single RLS bug can expose all user data. Test thoroughly.
